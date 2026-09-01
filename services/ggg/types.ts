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
 * The two URLs and the user agent are here rather than read from the environment, because
 * a service is configured by whoever builds it. Nothing in this package reads
 * `process.env`, so it runs with no `.env` at all.
 *
 * Passed as one object so that a new concern is a new field rather than a fifth
 * positional argument at every call site.
 */
export type GggContext = {
  limiter: RateLimiter;
  /** Base of the trade API, without a trailing slash. */
  tradeApiUrl: string;
  /** Base of the Currency Exchange endpoint on the CDN, without a trailing slash. */
  currencyApiUrl: string;
  /** Sent on every request. Names the application and a way to reach its author. */
  userAgent: string;
  /** Absent in production. Its presence is the only thing that turns caching on. */
  cache?: ResponseCache;
  onEvent?: (event: CallEvent) => void;
};

/**
 * What one side of a market did, keyed by the metadata id of that side. Both entries of
 * the market's own `market_pair` are always present and nothing else ever is, so a lookup
 * by either path is total.
 */
export type CurrencySide = Readonly<Record<string, number>>;

/**
 * One market: one pair of items, in one league, over one hour.
 *
 * **A market says nothing about what kind of item it trades.** There is no category here
 * and no name — every item is a metadata id, and turning one into a name or a category is
 * something only another source can do. Nor is it only currency: an hour carries divination
 * cards, scarabs, fragments and more, and the metadata prefix is the only hint of which.
 */
export type CurrencyMarket = {
  readonly league: string;
  /** The two sides of `market_pair` joined by `|`, in that order. */
  readonly market_id: string;
  /** Metadata ids of the two items traded. Always exactly two. */
  readonly market_pair: readonly [string, string];
  /** How much of each side changed hands this hour. Zero on a market that only stood. */
  readonly volume_traded: CurrencySide;
  readonly lowest_stock: CurrencySide;
  readonly highest_stock: CurrencySide;
  /** The two ends of the rate offered, as the amount of each side in one trade. */
  readonly lowest_ratio: CurrencySide;
  readonly highest_ratio: CurrencySide;
};

/** Envelope returned by `GET /api/currency-exchange/:hour`. */
export type CurrencyExchange = {
  /**
   * Start of the next hour, in unix seconds. Equal to the requested id at the end of the
   * stream — the hour now running is not published until it ends, and asking for it
   * answers `404` with an empty `markets`, which `call` raises rather than returns.
   */
  readonly next_change_id: number;
  readonly markets: readonly CurrencyMarket[];
};

