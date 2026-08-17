/**
 * A non-2xx answer from GGG. Thrown rather than returned so that callers who have no
 * sensible recovery fail loudly by doing nothing, while a queue worker catches once and
 * maps `retryable` onto its own retry vocabulary.
 */
export class GggHttpError extends Error {
  readonly url: string;
  readonly status: number;
  /** Whether trying the same request again could plausibly succeed. */
  readonly retryable: boolean;

  constructor(url: string, status: number, retryable: boolean) {
    super(`${url} failed: ${status}`);
    this.name = "GggHttpError";
    this.url = url;
    this.status = status;
    this.retryable = retryable;
  }
}
