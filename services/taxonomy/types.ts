/**
 * Where published taxonomies are kept, as an interface rather than a client.
 *
 * The service holds one of these the same way `@poe/ggg` holds a cache — as something it
 * was handed — so it stays ignorant of files, buckets and hosts. A local folder satisfies
 * it today and an HTTP client will satisfy it the day the taxonomy is served rather than
 * read, without this package changing.
 */
export type TaxonomyStore = {
  /** The parsed JSON at `key`, or `undefined` when there is nothing there. */
  read(key: string): Promise<unknown>;
};

export type TaxonomyServiceOptions = {
  store: TaxonomyStore;
  /**
   * What every key is prefixed with. Defaults to `taxonomy`, which is where
   * `apps/taxonomy` publishes.
   */
  prefix?: string;
};
