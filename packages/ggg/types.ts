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

/**
 * What every endpoint in this package needs from the process it runs in. The limiter
 * belongs to that process — one limiter is one IP, so it is handed in rather than made
 * here — the cache is present only where responses are being replayed, and `onEvent` is
 * bound to whatever the caller wants labelled.
 *
 * Passed as one object so that a new concern is a new field rather than a fifth
 * positional argument at every call site.
 */
export type GggContext = {
  limiter: RateLimiter;
  /** Absent in production. Its presence is the only thing that turns caching on. */
  cache?: ResponseCache;
  onEvent?: (event: CallEvent) => void;
};

/** Envelope returned by `POST /search/:league`. */
export type SearchResponse = {
  readonly id: string;
  readonly complexity: number;
  readonly total: number;
  /** Up to 100 result hashes. GGG caps the list regardless of `total`. */
  readonly result: readonly string[];
};

/**
 * Envelope returned by `GET /fetch/:hashes`. Rows are passed through untouched — this is
 * a raw drop, so only the envelope is asserted.
 */
export type FetchResponse = { readonly result: readonly unknown[] };

/**
 * One market: one currency pair, in one league, over one hour. Only `league` is read —
 * a market is written through exactly as it arrived, so nothing else is asserted here.
 */
export type CurrencyMarket = { readonly league: string };

/** Envelope returned by `GET /api/currency-exchange/:hour`. */
export type CurrencyExchange = {
  /** Unix hour of the next digest. Equal to the requested id at the end of the stream. */
  readonly next_change_id: number;
  readonly markets: readonly CurrencyMarket[];
};

/**
 * One row of `GET /data/items`. `name` is the unique's own name and is absent on
 * everything that is not a unique; `type` is the base item. `text` is the two joined,
 * which is what the trade site searches on, and `disc` disambiguates the handful of
 * uniques that share a name and a base.
 */
export type TradeItemEntry = {
  readonly name?: string;
  readonly type: string;
  readonly text?: string;
  readonly disc?: string;
  readonly flags?: { readonly unique?: boolean };
};

/** Envelope returned by `GET /data/items`. Entries arrive grouped by broad category. */
export type TradeItemsResponse = {
  readonly result: readonly {
    readonly id: string;
    readonly label: string;
    readonly entries: readonly TradeItemEntry[];
  }[];
};

/** A unique item as the trade data knows it: its own name and its base item. */
export type UniqueItem = { readonly name: string; readonly type: string };
