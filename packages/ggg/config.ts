import { requireEnv } from "@util/core/env";

/**
 * Where GGG lives. Endpoints in this package build their URLs from these and nothing
 * else, so a realm or a host is changed in one place rather than at every call site.
 */

/** Base of the trade API. The trailing slash is stripped so joins stay predictable. */
export const tradeApiUrl = () =>
  requireEnv("POE_TRADE_API_URL").replace(/\/$/, "");

/**
 * Base of the Currency Exchange endpoint on the CDN, without a trailing slash. The realm
 * is part of this value — the bare base is PoE1 PC, `.../currency-exchange/poe2` is PoE2.
 * An hour id is joined onto it.
 */
export const currencyApiUrl = () =>
  requireEnv("POE_CURRENCY_API_URL").replace(/\/$/, "");
