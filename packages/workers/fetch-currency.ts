import { call } from "@poe/ggg/call";
import { currencyApiUrl } from "./config.ts";
import type { CurrencyExchange, TradeContext } from "./types.ts";

/**
 * One hour of aggregate Currency Exchange history, every league in one payload.
 *
 * This is the CDN, not the trade API: it publishes no rate-limit headers and draws on no
 * budget the trade endpoints share. The limiter handed in is still honoured — it paces a
 * backfill of hundreds of hours into something polite — it simply has no rules to learn.
 */
export function fetchCurrencyHour(
  hourId: number,
  { limiter, cache, onEvent }: TradeContext,
): Promise<CurrencyExchange> {
  return call<CurrencyExchange>(`${currencyApiUrl()}/${hourId}`, {
    limiter,
    cache,
    onEvent,
  });
}
