/**
 * A version that is not there.
 *
 * Its own type because it is an ordinary answer rather than a fault: asking for a version
 * nobody published, or for `latest` before anything was promoted, is something a caller can
 * reasonably handle.
 */
export class TaxonomyNotFoundError extends Error {
  readonly key: string;

  constructor(key: string) {
    super(`No taxonomy at ${key}`);
    this.name = "TaxonomyNotFoundError";
    this.key = key;
  }
}
