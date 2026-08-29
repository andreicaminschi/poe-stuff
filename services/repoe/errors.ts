/**
 * A non-2xx answer from RePoE. Thrown rather than returned so that a caller with no
 * sensible recovery fails loudly by doing nothing.
 *
 * No `retryable` flag here, unlike GGG's. These are static files on GitHub Pages: there is
 * no budget to nurse, no rate limit published, and nothing mapping statuses onto a retry
 * vocabulary. A download that failed is asked for again by whoever wanted it.
 */
export class RepoeHttpError extends Error {
  readonly url: string;
  readonly status: number;

  constructor(url: string, status: number) {
    super(`repoe ${status} for ${url}`);
    this.name = "RepoeHttpError";
    this.url = url;
    this.status = status;
  }
}
