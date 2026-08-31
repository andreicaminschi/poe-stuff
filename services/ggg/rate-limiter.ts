import { sleep } from "@util/cache/sleep";
import type {
  RateLimiter,
  RateLimiterRule,
  RateLimitState,
} from "./types.ts";

// A limiter with no usable rules is a config mistake, not "unlimited" — the likely way
// to get here is a rate-limit header that failed to parse. Fail where it enters.
function assertRules(rules: RateLimiterRule[]) {
  if (rules.length === 0) {
    throw new RangeError("limiter needs at least one rule");
  }
  for (const r of rules) {
    if (!Number.isInteger(r.max) || r.max < 1) {
      throw new RangeError(
        `limiter rule max must be a positive integer, got ${r.max}`,
      );
    }
    if (!(r.windowMs > 0)) {
      throw new RangeError(
        `limiter rule windowMs must be positive, got ${r.windowMs}`,
      );
    }
  }
}

/** A deadline in the past, so `Math.max` against a real one always picks the real one. */
const NO_PENALTY = 0;

/** Nothing left to wait out — the slot is free this instant. */
const NO_WAIT = 0;

export type LimiterOptions = {
  /**
   * Stop bursting once a tier is this full, and spread requests at that tier's own
   * sustainable rate — its window divided by its allowance — instead of sprinting until
   * it is full and then stalling.
   *
   * A tier of "16 per 12 seconds" allows a burst of sixteen and then twelve seconds of
   * silence, or one request every 750ms forever. The first shape is what earns
   * restrictions: it rides the ceiling, where our count and the server's disagree by one
   * round trip. The second never gets close to it.
   *
   * Left out, the limiter bursts to the limit as before.
   */
  smoothAbove?: number;
};

/** Throws `RangeError` if `rules` is empty or any rule is unusable. */
export function createLimiter(
  rules: RateLimiterRule[],
  options: LimiterOptions = {},
): RateLimiter {
  assertRules(rules);

  const { smoothAbove } = options;

  let hits: number[] = [];
  let penaltyUntil = NO_PENALTY;
  let tail: Promise<void> = Promise.resolve();

  /** Why the most recent hold happened, kept for whoever reports the wait. */
  let lastWait: string | undefined;

  /**
   * What the server says we have spent that we did not record ourselves, one entry per
   * tier. Held by position rather than by window length: both headers list the same
   * tiers in the same order, and the windows they state are not identical to the ones
   * paced against — the rules are deliberately given room the states know nothing about.
   *
   * Per tier, because a count of 143 in six hours says nothing about the last twelve
   * seconds and must not be charged to it.
   */
  let unseen: { count: number; until: number }[] = [];

  const unseenAt = (tier: number, now: number) => {
    const held = unseen[tier];

    return held === undefined || held.until <= now ? 0 : held.count;
  };

  // reduce, not Math.max(...spread): an empty list would silently yield -Infinity and
  // trim away every hit. assertRules rules that out, and this keeps it out.
  const longest = () =>
    rules.reduce((widest, r) => Math.max(widest, r.windowMs), 0);

  // NO_WAIT = slot available now, else ms until something frees one up
  function waitFor(rule: RateLimiterRule, tier: number, now: number): number {
    const inWindow = hits.filter((t) => now - t < rule.windowMs);
    const spent = inWindow.length + unseenAt(tier, now);

    if (spent < rule.max) return NO_WAIT;

    // Either an old hit ages out or the server's count expires — whichever happens first
    // drops us back under the limit, and the caller re-checks after waiting.
    const held = unseen[tier];
    const oldest = inWindow[0];

    const frees = [
      held !== undefined && held.until > now ? held.until - now : Infinity,
      oldest === undefined ? Infinity : oldest + rule.windowMs - now,
    ];

    const wait = Math.min(...frees);

    return Number.isFinite(wait) ? Math.max(wait, 1) : NO_WAIT;
  }

  /**
   * How long to hold off so that a tier under pressure is spent at its own rate rather
   * than in bursts. NO_WAIT until the tier passes `smoothAbove`, so an idle budget is
   * still spent freely and only a filling one slows down.
   */
  function spacingFor(
    rule: RateLimiterRule,
    tier: number,
    now: number,
  ): number {
    if (smoothAbove === undefined) return NO_WAIT;

    const spent =
      hits.filter((t) => now - t < rule.windowMs).length + unseenAt(tier, now);
    if (spent < rule.max * smoothAbove) return NO_WAIT;

    const last = hits[hits.length - 1];
    if (last === undefined) return NO_WAIT;

    const spacing = rule.windowMs / rule.max;

    return Math.max(NO_WAIT, last + spacing - now);
  }

  async function take(): Promise<void> {
    for (;;) {
      const now = Date.now();
      hits = hits.filter((t) => now - t < longest()); // trim to widest window only

      // A penalty is not a rule — it holds with no requests on record and outlives any
      // window — so it is carried as a deadline and folded in here as one more wait.
      // The slowest of the lot decides; 0 only when the penalty has passed and every
      // rule has a slot free.
      let wait = Math.max(NO_WAIT, penaltyUntil - now);
      if (wait > NO_WAIT) {
        lastWait = `restriction, ${Math.ceil(wait / 1000)}s left to run`;
      }

      for (const [tier, rule] of rules.entries()) {
        const window = Math.round(rule.windowMs / 1000);
        const spent =
          hits.filter((t) => now - t < rule.windowMs).length +
          unseenAt(tier, now);

        const ruleWait = waitFor(rule, tier, now);
        if (ruleWait > wait) {
          wait = ruleWait;
          lastWait = `the ${window}s budget is full, ${spent} of ${rule.max} spent`;
        }

        const spacedWait = spacingFor(rule, tier, now);
        if (spacedWait > wait) {
          wait = spacedWait;
          lastWait = `spreading out the ${window}s budget, ${spent} of ${rule.max} spent`;
        }
      }

      if (wait > NO_WAIT) {
        await sleep(wait);
        continue;
      }

      hits.push(now);
      return;
    }
  }

  return {
    acquire() {
      const previous = tail;

      // The queue has to outlive a failed take, but neutralising a copy of the caller's
      // own promise also marks it handled — a dropped acquire() would then fail silently.
      // So the gate for the next caller is its own promise, and nothing is attached to
      // what we return.
      let release!: () => void;
      tail = new Promise<void>((resolve) => {
        release = resolve;
      });

      return previous.then(take).finally(release);
    },
    explainWait() {
      return lastWait;
    },
    setRules(next: RateLimiterRule[]) {
      assertRules(next);
      rules = next;
    },
    observe(state: RateLimitState[]) {
      const now = Date.now();

      // Their count is the real one: it includes anything else on this IP, and anything
      // this process made before it was restarted. Only the difference is carried, and
      // only for as long as the window it was counted in.
      unseen = state.map((tier) => {
        const windowMs = tier.windowSeconds * 1000;
        const mine = hits.filter((t) => now - t < windowMs).length;

        return {
          count: Math.max(0, tier.hits - mine),
          until: now + windowMs,
        };
      });
    },
    penalize(seconds: number) {
      // Never shortens an active hold: during a restriction every in-flight response
      // reports the same one, and a later, smaller figure must not cut it short.
      // History is kept — it ages out on its own, and forgetting it would hand back a
      // full budget the instant the hold lifts.
      penaltyUntil = Math.max(penaltyUntil, Date.now() + seconds * 1000);
    },
  };
}
