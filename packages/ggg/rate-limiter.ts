import { sleep } from "@util/core/sleep";
import type { RateLimiter, RateLimiterRule } from "./types.ts";

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

/** Throws `RangeError` if `rules` is empty or any rule is unusable. */
export function createLimiter(rules: RateLimiterRule[]): RateLimiter {
  assertRules(rules);

  let hits: number[] = [];
  let penaltyUntil = NO_PENALTY;
  let tail: Promise<void> = Promise.resolve();

  // reduce, not Math.max(...spread): an empty list would silently yield -Infinity and
  // trim away every hit. assertRules rules that out, and this keeps it out.
  const longest = () =>
    rules.reduce((widest, r) => Math.max(widest, r.windowMs), 0);

  // NO_WAIT = slot available now, else ms until this rule frees one
  function waitFor(rule: RateLimiterRule, now: number): number {
    const inWindow = hits.filter((t) => now - t < rule.windowMs);
    if (inWindow.length < rule.max) return NO_WAIT;

    const oldestBlocking = inWindow[inWindow.length - rule.max];
    if (oldestBlocking === undefined) return NO_WAIT; // unreachable given guard above

    return oldestBlocking + rule.windowMs - now;
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
      for (const rule of rules) {
        const ruleWait = waitFor(rule, now);
        if (ruleWait > wait) wait = ruleWait;
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
    setRules(next: RateLimiterRule[]) {
      assertRules(next);
      rules = next;
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
