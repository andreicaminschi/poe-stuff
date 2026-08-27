/**
 * A non-2xx answer from PoeWatch. Thrown rather than returned so that a caller with no
 * sensible recovery fails loudly by doing nothing.
 *
 * No `retryable` flag here, unlike GGG's. PoeWatch publishes no rate limits and every call
 * in this package is one request for a whole league, so there is no budget to nurse and no
 * queue worker mapping statuses onto a retry vocabulary.
 */
export class PoeWatchHttpError extends Error {
  readonly url: string;
  readonly status: number;

  constructor(url: string, status: number) {
    super(`poewatch ${status} for ${url}`);
    this.name = "PoeWatchHttpError";
    this.url = url;
    this.status = status;
  }
}
