import { call } from "./call.ts";
import type { CurrencyExchange, GggContext } from "./types.ts";

/**
 * One hour of aggregate Currency Exchange history, every league in one payload.
 *
 * This is the CDN, not the trade API: it publishes no rate-limit headers and draws on no
 * budget the trade endpoints share. The limiter handed in is still honoured — it paces a
 * backfill of hundreds of hours into something polite — it simply has no rules to learn.
 */
export function fetchCurrencyHour(
  hourId: number,
  { limiter, currencyApiUrl, userAgent, cache, onEvent }: GggContext,
): Promise<CurrencyExchange> {
  return call<CurrencyExchange>(`${currencyApiUrl}/${hourId}`, {
    userAgent,
    limiter,
    cache,
    onEvent,
  });
}
