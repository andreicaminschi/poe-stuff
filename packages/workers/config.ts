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

export const HOUR_SECONDS = 3600;

/**
 * How far behind the clock the newest collectable hour is. The endpoint never serves the
 * hour in progress, and the hour just closed is not reliably there either, so two hours
 * back is the newest one worth asking for.
 */
export const CURRENCY_LAG_HOURS = 2;

/**
 * Base of the Currency Exchange endpoint on the CDN, without a trailing slash. The realm
 * is part of this value — the bare base is PoE1 PC, `.../currency-exchange/poe2` is PoE2.
 * An hour id is joined onto it.
 */
export const currencyApiUrl = () =>
  requireEnv("POE_CURRENCY_API_URL").replace(/\/$/, "");

/**
 * The one league kept out of each response. Every league arrives in one payload and
 * there is no server-side filter, so this is applied on the way to S3.
 */
export const currencyLeague = () => requireEnv("POE_CURRENCY_LEAGUE");

const asHour = (seconds: number) => seconds - (seconds % HOUR_SECONDS);

/**
 * The oldest hour to collect, set by hand: a unix timestamp, or anything `Date` parses
 * (`2026-08-01`, `2026-08-01T00:00:00Z`). There is no way to ask GGG how far its history
 * goes, so the floor is a decision rather than something discovered — and it is what
 * stops a sweep walking back to 1970.
 */
export function currencyFromHour(): number {
  const raw = requireEnv("POE_CURRENCY_FROM");
  const seconds = /^\d+$/.test(raw)
    ? Number(raw)
    : Math.floor(Date.parse(raw) / 1000);

  if (!Number.isFinite(seconds)) {
    throw new RangeError(
      `POE_CURRENCY_FROM is neither a unix timestamp nor a date: ${raw}`,
    );
  }

  return asHour(seconds);
}

/** The newest hour worth asking for, `CURRENCY_LAG_HOURS` behind the clock. */
export const latestCurrencyHour = (now: number = Date.now()): number =>
  asHour(Math.floor(now / 1000)) - CURRENCY_LAG_HOURS * HOUR_SECONDS;
