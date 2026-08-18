/** At most `max` acquisitions per rolling `windowMs`. */
export type RateLimiterRule = { max: number; windowMs: number };

export type RateLimiter = {
  /** Resolves when a slot is free. Callers are served in the order they asked. */
  acquire(): Promise<void>;
  /**
   * Why the last `acquire` held, in words — which tier, how full it was, or the
   * restriction it was waiting out. Undefined when nothing has held yet.
   */
  explainWait(): string | undefined;
  /**
   * Replaces the rules for every subsequent check, including the next one made by a
   * caller that is already waiting. Throws `RangeError` on an unusable list, leaving
   * the current rules in place.
   */
  setRules(next: RateLimiterRule[]): void;
  /**
   * Folds the server.s own count of what has been spent into the local history, per
   * window. Whatever it reports beyond what this limiter recorded — another process on
   * the same IP, a browser tab, requests made before a restart — is charged to that
   * window until it expires.
   */
  observe(state: RateLimitState[]): void;
  /**
   * Blocks all callers for `seconds`, keeping the request history intact. Never
   * shortens a hold that already runs longer.
   */
  penalize(seconds: number): void;
};

/** A response worth keeping, in the only form that survives being written down. */
export type CachedResponse = {
  url: string;
  status: number;
  body: unknown;
  storedAt: string;
};

/**
 * Somewhere previous answers live. `call` holds one of these the same way it holds a
 * limiter — as an interface it was handed — so it stays ignorant of files, buckets and
 * clients.
 *
 * A key is derived from the request itself, so the same request always looks the same to
 * whatever implements this, on any machine and in any run.
 */
export type ResponseCache = {
  get(key: string): Promise<CachedResponse | undefined>;
  set(key: string, value: CachedResponse): Promise<void>;
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
  | { type: "wait"; ms: number; reason?: string }
  | { type: "request"; url: string; method: string; attempt: number }
  | { type: "response"; url: string; status: number; durationMs: number }
  | { type: "retry"; url: string; status: number; backoffMs: number }
  | {
      type: "penalize";
      seconds: number;
      source: "retry-after" | "state" | "fallback";
    }
  // A miss emits nothing: the `request` that follows it says the same thing.
  | { type: "cache"; result: "hit" | "stored"; key: string }
  /**
   * What the server said about the budget on this response: which policy it counted
   * against, the rules it published, and how much of each window is already spent.
   */
  | {
      type: "limits";
      policy: string;
      rules: RateLimiterRule[];
      state: RateLimitState[];
    };
