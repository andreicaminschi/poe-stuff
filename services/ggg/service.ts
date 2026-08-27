import {
  DEFAULT_CURRENCY_API_URL,
  DEFAULT_TRADE_API_URL,
  trimUrl,
} from "./config.ts";
import { fetchCurrencyHour } from "./fetch-currency-hour.ts";
import {
  fetchAllListings,
  fetchListings,
  pageHashes,
} from "./fetch-listings.ts";
import type { GGGListingPage } from "./fetch-listings.types.ts";
import { getItemData } from "./get-item-data.ts";
import type { GGGItemGroup } from "./get-item-data.types.ts";
import { getStaticItems } from "./get-static-items.ts";
import type { GGGStaticItem } from "./get-static-items.types.ts";
import { getStats } from "./get-stats.ts";
import type { GGGStat } from "./get-stats.types.ts";
import { createLimiter } from "./rate-limiter.ts";
import { searchListings } from "./search-listings.ts";
import type { GGGListingSearch } from "./search-listings.types.ts";
import type {
  CallEvent,
  CurrencyExchange,
  RateLimiterRule,
  ResponseCache,
} from "./types.ts";

/**
 * Where the limiter starts before GGG's headers replace it. One request per second is
 * slower than any published policy, so a first call can never open too fast.
 */
const OPENING_RULES: RateLimiterRule[] = [{ max: 1, windowMs: 1_000 }];

export type GGGServiceOptions = {
  /**
   * Sent as `user-agent` on every request. Required, and the one option with no default:
   * GGG asks that it name the application *and* a way to reach whoever runs it, so they
   * can contact the author instead of blocking the traffic. A default would send a
   * contact that does not exist, which is the one thing they ask callers not to do.
   *
   *     poe-stuff/1.0 (contact: you@example.com)
   */
  userAgent: string;
  /** Base of the trade API. Defaults to `DEFAULT_TRADE_API_URL`. */
  tradeApiUrl?: string;
  /**
   * Base of the Currency Exchange endpoint on the CDN. The realm is part of it — the
   * default is PoE1 PC, `.../currency-exchange/poe2` is PoE2.
   */
  currencyApiUrl?: string;
  rules?: RateLimiterRule[];
  /** Pace requests instead of bursting once a window is this full, as a fraction. */
  smoothAbove?: number;
  /** Absent in production. Its presence is the only thing that turns caching on. */
  cache?: ResponseCache;
  onEvent?: (event: CallEvent) => void;
};

export type GGGService = {
  getItemData(): Promise<readonly GGGItemGroup[]>;
  getStaticItems(): Promise<readonly GGGStaticItem[]>;
  getStats(): Promise<readonly GGGStat[]>;
  searchListings(query: unknown, league: string): Promise<GGGListingSearch>;
  fetchListings(
    hashes: readonly string[],
    searchId: string,
    page: number,
  ): Promise<GGGListingPage>;
  fetchAllListings(
    hashes: readonly string[],
    searchId: string,
    maxPages?: number,
  ): Promise<readonly GGGListingPage[]>;
  pageHashes(
    hashes: readonly string[],
    maxPages?: number,
  ): readonly (readonly string[])[];
  fetchCurrencyHour(hourId: number): Promise<CurrencyExchange>;
};

/**
 * One service is one IP. GGG counts every request from an address against a single
 * budget, so a second service in the same process spends that budget twice as fast
 * without either one knowing.
 */
export function createGGGService({
  userAgent,
  tradeApiUrl = DEFAULT_TRADE_API_URL,
  currencyApiUrl = DEFAULT_CURRENCY_API_URL,
  rules = OPENING_RULES,
  smoothAbove,
  cache,
  onEvent,
}: GGGServiceOptions): GGGService {
  const context = {
    limiter: createLimiter(rules, { ...(smoothAbove === undefined ? {} : { smoothAbove }) }),
    tradeApiUrl: trimUrl(tradeApiUrl),
    currencyApiUrl: trimUrl(currencyApiUrl),
    userAgent,
    ...(cache === undefined ? {} : { cache }),
    ...(onEvent === undefined ? {} : { onEvent }),
  };

  return {
    getItemData: () => getItemData(context),
    getStaticItems: () => getStaticItems(context),
    getStats: () => getStats(context),
    searchListings: (query, league) => searchListings(query, league, context),
    fetchListings: (hashes, searchId, page) =>
      fetchListings(hashes, searchId, page, context),
    fetchAllListings: (hashes, searchId, maxPages) =>
      fetchAllListings(hashes, searchId, context, maxPages),
    pageHashes,
    fetchCurrencyHour: (hourId) => fetchCurrencyHour(hourId, context),
  };
}
