import {
  DEFAULT_CURRENCY_API_URL,
  DEFAULT_FORUM_URL,
  DEFAULT_TRADE_API_URL,
  trimUrl,
} from "./config.ts";
import { fetchCurrencyHour } from "./fetch-currency-hour.ts";
import type { FetchCurrencyHourOptions } from "./fetch-currency-hour.ts";
import { forumThreadUrl, getForumThread } from "./get-forum-thread.ts";
import { getNewsPage } from "./get-news-page.ts";
import {
  fetchAllListings,
  fetchListings,
  pageHashes,
} from "./fetch-listings.ts";
import type { GGGListingPage } from "./fetch-listings.types.ts";
import { getItemData } from "./get-item-data.ts";
import type { GGGItemGroup } from "./get-item-data.types.ts";
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
  /**
   * Base of the forum. Not an API — GGG publishes announcements as forum threads and
   * nothing else — but the same host and the same per-IP budget as the trade endpoints,
   * so it is paced by the same limiter.
   */
  forumUrl?: string;
  rules?: RateLimiterRule[];
  /** Pace requests instead of bursting once a window is this full, as a fraction. */
  smoothAbove?: number;
  /** Absent in production. Its presence is the only thing that turns caching on. */
  cache?: ResponseCache;
  onEvent?: (event: CallEvent) => void;
};

export type GGGService = {
  getItemData(): Promise<readonly GGGItemGroup[]>;
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
  /** One hour of the Currency Exchange. Pass `league` to be handed only that league. */
  fetchCurrencyHour(
    hourId: number,
    options?: FetchCurrencyHourOptions,
  ): Promise<CurrencyExchange>;
  /** One page of the news forum, as HTML. */
  getNewsPage(page: number): Promise<string>;
  /** Where a thread lives. Nothing outside this package spells the URL out. */
  forumThreadUrl(threadId: number): string;
  /** One forum thread, as HTML. */
  getForumThread(threadId: number): Promise<string>;
};

/**
 * One service is one budget, and GGG keeps that budget per IP address.
 *
 * So the rule is about the address, not the object. Two services inside one process share
 * one address and spend one budget twice as fast, neither of them aware of the other —
 * that is the case to avoid. Two services on two machines are two addresses and two
 * budgets, and are no problem at all.
 *
 * Which is what lets this scale out. Put several instances behind one shared queue, each
 * with its own address, and every one of them builds its own service at start-up: each
 * limiter then paces the only budget its instance can spend, and the fleet's throughput
 * is the sum of them. Nothing is shared between the instances and nothing needs to be —
 * a limiter that tried to would be pacing a budget GGG never charges it for.
 *
 * The exception inside one process is an endpoint metered under its own policy. GGG
 * counts search and fetch separately, and a limiter holds one set of rules at a time, so
 * a service each is how those two are paced correctly rather than a way of getting more.
 */
export function createGGGService({
  userAgent,
  tradeApiUrl = DEFAULT_TRADE_API_URL,
  currencyApiUrl = DEFAULT_CURRENCY_API_URL,
  forumUrl = DEFAULT_FORUM_URL,
  rules = OPENING_RULES,
  smoothAbove,
  cache,
  onEvent,
}: GGGServiceOptions): GGGService {
  const context = {
    limiter: createLimiter(rules, { ...(smoothAbove === undefined ? {} : { smoothAbove }) }),
    tradeApiUrl: trimUrl(tradeApiUrl),
    currencyApiUrl: trimUrl(currencyApiUrl),
    forumUrl: trimUrl(forumUrl),
    userAgent,
    ...(cache === undefined ? {} : { cache }),
    ...(onEvent === undefined ? {} : { onEvent }),
  };

  return {
    getItemData: () => getItemData(context),
    getStats: () => getStats(context),
    searchListings: (query, league) => searchListings(query, league, context),
    fetchListings: (hashes, searchId, page) =>
      fetchListings(hashes, searchId, page, context),
    fetchAllListings: (hashes, searchId, maxPages) =>
      fetchAllListings(hashes, searchId, context, maxPages),
    pageHashes,
    fetchCurrencyHour: (hourId, options) =>
      fetchCurrencyHour(hourId, context, options),
    getNewsPage: (page) => getNewsPage(page, context),
    getForumThread: (threadId) => getForumThread(threadId, context),
    forumThreadUrl: (threadId) => forumThreadUrl(threadId, context.forumUrl),
  };
}
