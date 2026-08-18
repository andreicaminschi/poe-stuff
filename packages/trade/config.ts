import { requireEnv } from "@util/core/env";

/** Fetch takes at most ten hashes per call. One page. */
export const FETCH_CHUNK = 10;

/**
 * How much of a search to fetch when the query does not say. A search hands back up to
 * 100 hashes, which is ten pages, but results are sorted by price — the cheap end is
 * where the market is, and the tail is listings nobody is buying at prices nobody pays.
 *
 * It is also most of what a cohort costs: three pages instead of ten is a third of the
 * fetch budget, and that budget is the thing in shortest supply. A query that needs more
 * depth says so itself with `maxPages`.
 */
export const MAX_PAGES = 3;

/** Base of the trade API. The trailing slash is stripped so joins stay predictable. */
export const tradeApiUrl = () =>
  requireEnv("POE_TRADE_API_URL").replace(/\/$/, "");
