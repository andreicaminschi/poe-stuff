import { requireEnv } from "@util/core/env";

/** Fetch takes at most ten hashes per call. One page. */
export const FETCH_CHUNK = 10;

/** Base of the trade API. The trailing slash is stripped so joins stay predictable. */
export const tradeApiUrl = () =>
  requireEnv("POE_TRADE_API_URL").replace(/\/$/, "");
