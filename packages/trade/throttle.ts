/**
 * Per-instance rate limiter. GGG limits by IP and every task has its own, so
 * this is deliberately process-local — sharing counters across instances would
 * throttle each one to 1/N of the budget it actually owns.
 *
 * Two sources of truth, combined:
 *   - our own request timestamps, which give exact expiry
 *   - `x-rate-limit-ip-state`, which is authoritative and survives restarts
 * Whichever says we've used more wins.
 */

/** One tier: `requests:windowSeconds:banSeconds`. */
export type Tier = {
  readonly requests: number;
  readonly windowSeconds: number;
  readonly banSeconds: number;
};

/** Observed usage: `hits:windowSeconds:restrictedSeconds`. */
export type TierState = {
  readonly hits: number;
  readonly windowSeconds: number;
  readonly restrictedSeconds: number;
};

export const SEARCH_POLICY = "trade-search-request-limit";
export const FETCH_POLICY = "trade-fetch-request-limit";

/** Paces the first request of a cold start; replaced by real headers after that. */
const DEFAULT_TIERS: Readonly<Record<string, readonly Tier[]>> = {
  [SEARCH_POLICY]: [
    { requests: 5, windowSeconds: 10, banSeconds: 60 },
    { requests: 15, windowSeconds: 60, banSeconds: 300 },
    { requests: 30, windowSeconds: 300, banSeconds: 1800 },
    { requests: 600, windowSeconds: 21600, banSeconds: 3600 },
  ],
  [FETCH_POLICY]: [
    { requests: 12, windowSeconds: 4, banSeconds: 10 },
    { requests: 16, windowSeconds: 12, banSeconds: 300 },
    { requests: 50, windowSeconds: 300, banSeconds: 300 },
    { requests: 1000, windowSeconds: 21600, banSeconds: 1800 },
  ],
};

/**
 * Stop this far short of every limit. The state header reflects the *previous*
 * response, so the last slot in a window is the one most likely to be wrong.
 */
const HEADROOM = 1;

export function parseTiers(header: string | null): Tier[] {
  return parseTriples(header).map(([requests, windowSeconds, banSeconds]) => ({
    requests,
    windowSeconds,
    banSeconds,
  }));
}

export function parseState(header: string | null): TierState[] {
  return parseTriples(header).map(([hits, windowSeconds, restrictedSeconds]) => ({
    hits,
    windowSeconds,
    restrictedSeconds,
  }));
}

function parseTriples(header: string | null): [number, number, number][] {
  if (header === null || header === "") return [];
  return header.split(",").flatMap((part) => {
    const [a, b, c] = part.split(":").map(Number);
    if (a === undefined || b === undefined || c === undefined) return [];
    if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) return [];
    return [[a, b, c] as [number, number, number]];
  });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class RateLimiter {
  readonly #policy: string;
  #tiers: readonly Tier[];
  /** Request timestamps per tier, newest last. */
  #hits: number[][];
  #bannedUntil = 0;

  constructor(policy: string) {
    this.#policy = policy;
    this.#tiers = DEFAULT_TIERS[policy] ?? [];
    this.#hits = this.#tiers.map(() => []);
  }

  /** Blocks until a request is safe, then records it. */
  async acquire(): Promise<void> {
    for (;;) {
      const now = Date.now();

      if (this.#bannedUntil > now) {
        const wait = this.#bannedUntil - now;
        console.error(`  [throttle] ${this.#policy} restricted, waiting ${wait}ms`);
        await sleep(wait);
        continue;
      }

      const wait = this.#waitFor(now);
      if (wait <= 0) {
        for (const hits of this.#hits) hits.push(now);
        return;
      }

      console.error(`  [throttle] ${this.#policy} at limit, waiting ${wait}ms`);
      await sleep(wait);
    }
  }

  /** Longest wait across tiers, 0 when every tier has room. */
  #waitFor(now: number): number {
    let wait = 0;

    this.#tiers.forEach((tier, index) => {
      const hits = this.#hits[index];
      if (hits === undefined) return;

      const windowMs = tier.windowSeconds * 1000;
      while (hits.length > 0 && (hits[0] ?? 0) <= now - windowMs) hits.shift();

      const allowed = Math.max(1, tier.requests - HEADROOM);
      if (hits.length < allowed) return;

      const oldest = hits[0] ?? now;
      wait = Math.max(wait, oldest + windowMs - now);
    });

    return wait;
  }

  /**
   * Folds a response's headers back in: refreshes tiers, adopts the server's
   * count when it is higher than ours, and records any active restriction.
   */
  observe(response: Response): void {
    const tiers = parseTiers(response.headers.get("x-rate-limit-ip"));
    if (tiers.length > 0 && tiers.length !== this.#tiers.length) {
      this.#hits = tiers.map((_, index) => this.#hits[index] ?? []);
    }
    if (tiers.length > 0) this.#tiers = tiers;

    const now = Date.now();

    for (const state of parseState(response.headers.get("x-rate-limit-ip-state"))) {
      const index = this.#tiers.findIndex((tier) => tier.windowSeconds === state.windowSeconds);
      const hits = this.#hits[index];
      if (hits === undefined) continue;

      // Server counted more than we did — pad with entries timestamped now, so
      // they expire late rather than early. Never trim: undercounting is what
      // gets you banned.
      for (let i = hits.length; i < state.hits; i++) hits.push(now);

      if (state.restrictedSeconds > 0) {
        this.#bannedUntil = Math.max(this.#bannedUntil, now + state.restrictedSeconds * 1000);
      }
    }

    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("retry-after"));
      const longest = Math.max(0, ...this.#tiers.map((tier) => tier.banSeconds));
      const seconds = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : longest || 60;
      this.#bannedUntil = Math.max(this.#bannedUntil, now + seconds * 1000);
      console.error(`  [throttle] ${this.#policy} 429 → holding ${seconds}s`);
    }
  }
}
