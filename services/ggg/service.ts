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
  rules = OPENING_RULES,
  smoothAbove,
  cache,
  onEvent,
}: GGGServiceOptions = {}): GGGService {
  const context = {
    limiter: createLimiter(rules, { ...(smoothAbove === undefined ? {} : { smoothAbove }) }),
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
