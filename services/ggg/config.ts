/**
 * Where GGG lives by default. Endpoints in this package build their URLs from the values
 * on the context, and these are what `createGGGService` puts there when the caller names
 * nothing — so a realm or a host is changed at the constructor rather than in the
 * environment or at every call site.
 *
 * Constants rather than env reads: a service is configured by whoever builds it. Nothing
 * in this package touches `process.env`, which is what lets it run with no `.env` at all.
 */

/** Base of the trade API, without a trailing slash. */
export const DEFAULT_TRADE_API_URL = "https://www.pathofexile.com/api/trade";

/**
 * Base of the Currency Exchange endpoint on the CDN, without a trailing slash. The realm
 * is part of this value — this is PoE1 PC, `.../currency-exchange/poe2` is PoE2. An hour
 * id is joined onto it.
 */
export const DEFAULT_CURRENCY_API_URL =
  "https://web.poecdn.com/api/currency-exchange";

/** Trailing slash stripped, so joins onto a base stay predictable. */
export const trimUrl = (url: string): string => url.replace(/\/$/, "");
