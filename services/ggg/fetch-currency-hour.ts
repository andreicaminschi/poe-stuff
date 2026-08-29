import { call } from "./call.ts";
import type { CurrencyExchange, GggContext } from "./types.ts";

export type FetchCurrencyHourOptions = {
  /**
   * Keep only this league's markets. Absent means every league, as the CDN sent them.
   *
   * **The trim happens here, not on the server.** GGG publishes one file per hour with
   * every league in it and takes no query, so this saves the caller the walk rather than
   * the download. It lives here because the caller has no better place to put it: a league
   * is what a consumer of this endpoint always means.
   */
  readonly league?: string;
};

/**
 * One hour of aggregate Currency Exchange history.
 *
 * This is the CDN, not the trade API: it publishes no rate-limit headers and draws on no
 * budget the trade endpoints share. The limiter handed in is still honoured — it paces a
 * backfill of hundreds of hours into something polite — it simply has no rules to learn.
 *
 * `next_change_id` is answered untouched even when a league is asked for, so a backfill
 * still walks the stream from whatever it gets back.
 */
export async function fetchCurrencyHour(
  hourId: number,
  { limiter, currencyApiUrl, userAgent, cache, onEvent }: GggContext,
  { league }: FetchCurrencyHourOptions = {},
): Promise<CurrencyExchange> {
  const digest = await call<CurrencyExchange>(`${currencyApiUrl}/${hourId}`, {
    userAgent,
    limiter,
    cache,
    onEvent,
  });

  if (league === undefined) return digest;

  return {
    ...digest,
    markets: digest.markets.filter((market) => market.league === league),
  };
}
