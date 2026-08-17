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

/**
 * Outcome of one trade API call. A non-2xx response is a value, not a throw — the caller
 * decides what to do with it, and `retryable` says whether trying again is worthwhile.
 * `body` is the parsed JSON, unvalidated: `call` asserts the shape rather than checking it.
 */
export type ApiResult<T> =
  | { ok: true; body: T }
  | { ok: false; status: number; retryable: boolean };

/** One tier's usage as the server reports it, straight off the wire. */
export type RateLimitState = {
  hits: number;
  windowSeconds: number;
  restrictedSeconds: number;
};
