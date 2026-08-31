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
 * Structurally identical to the one `@poe/ggg` and `@poe/poe-watch` declare, on purpose
 * rather than by accident: one `fileCache<CachedResponse>(root)` from
 * `@util/cache/file-cache` satisfies every service in the repo, and no service has to import
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
 *
 * Passed as one object so that a new concern is a new field rather than a fourth
 * positional argument at every call site.
 */
export type RepoeContext = {
  /** Base of the RePoE site, without a trailing slash. */
  baseUrl: string;
  /** Sent on every request. */
  userAgent: string;
  /**
   * Absent by default. Its presence is the only thing that turns caching on — and
   * `base_items.json` is the whole export on every call, so a laptop wants it.
   */
  cache?: ResponseCache;
};
