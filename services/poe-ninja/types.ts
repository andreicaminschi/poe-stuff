/**
 * What more than one endpoint in this package needs.
 *
 * Two vocabularies live in the `*.types.ts` files beside each endpoint, and they are
 * deliberately kept apart:
 *
 * - **The wire types** — `ItemOverviewLine`, `ExchangeOverviewResponse` and friends — are
 *   poe.ninja's own shapes, named the way poe.ninja names them. Optional means the field
 *   is absent from the payload rather than null: a level 1 gem arrives with no
 *   `gemQuality` key at all, and a `Vaal Regalia` base with no `variant` is uninfluenced.
 * - **The output types** — `NinjaItem` and `NinjaExchangeItem` — are what the filter's
 *   classifier reads a market through. Same field names, same units, same meanings.
 *
 * Shapes were derived from a full download of all 28 item types and the exchange for one
 * league: 33,200 item lines, and every field in them was seen on at least one.
 */

/** A seven-day price series. `data` carries nulls for days with no sample. */
export type SparkLine = {
  readonly totalChange: number;
  readonly data: readonly (number | null)[];
};

/** A response worth keeping, in the only form that survives being written down. */
export type CachedResponse = {
  url: string;
  status: number;
  body: unknown;
  storedAt: string;
};

/**
 * Somewhere previous answers live. `call` holds one of these as an interface it was handed,
 * so it stays ignorant of files, buckets and clients.
 *
 * Structurally identical to the ones `@poe/ggg` and `@poe/poe-watch` declare, on purpose
 * rather than by accident: one `fileCache<CachedResponse>(root)` from
 * `@util/core/file-cache` satisfies every service in the repo, and no service has to import
 * another to say so.
 */
export type ResponseCache = {
  get(key: string): Promise<CachedResponse | undefined>;
  set(key: string, value: CachedResponse): Promise<void>;
};

/**
 * What every endpoint in this package needs from the process it runs in.
 *
 * The URL and the user agent are here rather than read from the environment, because a
 * service is configured by whoever builds it. Nothing in this package reads `process.env`,
 * so it runs with no `.env` at all.
 */
export type PoeNinjaContext = {
  /** Base of the poe.ninja API, without a trailing slash. */
  baseUrl: string;
  /** Sent on every request. */
  userAgent: string;
  /**
   * Absent by default. Its presence is the only thing that turns caching on — and a whole
   * market is 46 requests, so a laptop wants it.
   */
  cache?: ResponseCache;
};
