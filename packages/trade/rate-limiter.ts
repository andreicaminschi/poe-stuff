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

/** Throws `RangeError` if `rules` is empty or any rule is unusable. */
export function createLimiter(rules: RateLimiterRule[]): RateLimiter {
  assertRules(rules);

  let hits: number[] = [];
  let penaltyUntil = 0;
  let tail: Promise<void> = Promise.resolve();

  // reduce, not Math.max(...spread): an empty list would silently yield -Infinity and
  // trim away every hit. assertRules rules that out, and this keeps it out.
  const longest = () =>
    rules.reduce((widest, r) => Math.max(widest, r.windowMs), 0);

  // 0 = slot available now, else ms until this rule frees one
  function waitFor(rule: RateLimiterRule, now: number): number {
    const inWindow = hits.filter((t) => now - t < rule.windowMs);
    if (inWindow.length < rule.max) return 0;

    const oldestBlocking = inWindow[inWindow.length - rule.max];
    if (oldestBlocking === undefined) return 0; // unreachable given guard above

    return oldestBlocking + rule.windowMs - now;
  }

  async function take(): Promise<void> {
    for (;;) {
      const now = Date.now();
      hits = hits.filter((t) => now - t < longest()); // trim to widest window only

      if (now < penaltyUntil) {
        await sleep(penaltyUntil - now);
        continue;
      }

      // the slowest rule decides; 0 only when every rule has a slot free
      let wait = 0;
      for (const rule of rules) {
        const ruleWait = waitFor(rule, now);
        if (ruleWait > wait) wait = ruleWait;
      }

      if (wait === 0) {
        hits.push(now);
        return;
      }
      await sleep(wait);
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
      penaltyUntil = Date.now() + seconds * 1000;
      hits = [];
    },
  };
}
