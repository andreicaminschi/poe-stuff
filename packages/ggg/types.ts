/** At most `max` acquisitions per rolling `windowMs`. */
export type RateLimiterRule = { max: number; windowMs: number };

export type RateLimiter = {
  /** Resolves when a slot is free. Callers are served in the order they asked. */
  acquire(): Promise<void>;
  /**
   * Replaces the rules for every subsequent check, including the next one made by a
   * caller that is already waiting. Throws `RangeError` on an unusable list, leaving
   * the current rules in place.
   */
  setRules(next: RateLimiterRule[]): void;
  /**
   * Blocks all callers for `seconds`, keeping the request history intact. Never
   * shortens a hold that already runs longer.
   */
  penalize(seconds: number): void;
};

/** One tier's usage as the server reports it, straight off the wire. */
export type RateLimitState = {
  hits: number;
  windowSeconds: number;
  restrictedSeconds: number;
};

/**
 * What one `call` did, as it happened. `wait` and `penalize` are the only place the
 * limiter's behaviour becomes visible from outside, so a stalled run is readable
 * without instrumenting the limiter itself.
 *
 * No caller context here on purpose — no search id, no page number. `call` has no
 * vocabulary for what it is fetching; bind that in a closure at the call site.
 */
export type CallEvent =
  | { type: "wait"; ms: number }
  | { type: "request"; url: string; method: string; attempt: number }
  | { type: "response"; url: string; status: number; durationMs: number }
  | { type: "retry"; url: string; status: number; backoffMs: number }
  | {
      type: "penalize";
      seconds: number;
      source: "retry-after" | "state" | "fallback";
    };
