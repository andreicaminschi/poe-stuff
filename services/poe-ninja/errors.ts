/**
 * A non-2xx answer from poe.ninja. Thrown rather than returned so that a caller with no
 * sensible recovery fails loudly by doing nothing.
 *
 * `attempts` says whether the request was already asked twice. Only 429 and 5xx are
 * retried: a 404 is an endpoint that does not exist and a 400 is a query that is wrong, and
 * asking either again is how a typo becomes two requests instead of one error.
 */
export class PoeNinjaHttpError extends Error {
  readonly url: string;
  readonly status: number;
  readonly attempts: number;

  constructor(url: string, status: number, attempts: number) {
    super(
      `poe-ninja ${status} for ${url}${attempts > 1 ? ` (${attempts} attempts)` : ""}`,
    );
    this.name = "PoeNinjaHttpError";
    this.url = url;
    this.status = status;
    this.attempts = attempts;
  }
}
