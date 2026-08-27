import { DEFAULT_BASE_URL, DEFAULT_USER_AGENT, trimUrl } from "./config.ts";
import { getExchangeOverview } from "./get-exchange-overview.ts";
import type {
  ExchangeOverviewResponse,
  ExchangeType,
} from "./get-exchange-overview.types.ts";
import { getExchangeRatios } from "./get-exchange-ratios.ts";
import type { NinjaExchangeItem } from "./get-exchange-ratios.types.ts";
import { getItemOverview } from "./get-item-overview.ts";
import type {
  ItemOverviewLine,
  ItemType,
} from "./get-item-overview.types.ts";
import { getLeagueItems } from "./get-league-items.ts";
import type { NinjaItem } from "./get-league-items.types.ts";
import { getLeagues } from "./get-leagues.ts";
import type { EconomyLeague } from "./get-leagues.types.ts";
import type { ResponseCache } from "./types.ts";

export type PoeNinjaServiceOptions = {
  /** Base of the poe.ninja API. Defaults to `https://poe.ninja`. */
  baseUrl?: string;
  /** Sent as `user-agent` on every request. Defaults to `poe-stuff/1.0`. */
  userAgent?: string;
  /**
   * Absent by default, which means every call re-downloads. A whole market is 46 requests,
   * so handing one over is what makes a second run inside the hour free.
   */
  cache?: ResponseCache;
};

export type PoeNinjaService = {
  getLeagues(): Promise<readonly EconomyLeague[]>;
  getLeagueItems(league: string): Promise<readonly NinjaItem[]>;
  getExchangeRatios(league: string): Promise<readonly NinjaExchangeItem[]>;
  getItemOverview(
    league: string,
    type: ItemType,
  ): Promise<readonly ItemOverviewLine[]>;
  getExchangeOverview(
    league: string,
    type: ExchangeType,
  ): Promise<ExchangeOverviewResponse>;
};

/**
 * poe.ninja's economy API behind one object.
 *
 * **A whole market is 46 requests, not one.** There is no endpoint that answers for a
 * league — poe.ninja publishes a market per kind of item — so `getLeagueItems` fans out
 * over 28 types and `getExchangeRatios` over 18, four at a time. That bound is their terms
 * asking callers to be reasonable, not a rate limit: poe.ninja is not GGG, publishes no
 * limits, and nothing here draws on the GGG budget, so there is no reason to build only
 * one of these per process.
 *
 * `getItemOverview` and `getExchangeOverview` are the single-type calls the two fan-outs
 * are made of, exposed for a caller that wants one kind of item rather than a market.
 */
export function createPoeNinjaService({
  baseUrl = DEFAULT_BASE_URL,
  userAgent = DEFAULT_USER_AGENT,
  cache,
}: PoeNinjaServiceOptions = {}): PoeNinjaService {
  const context = {
    baseUrl: trimUrl(baseUrl),
    userAgent,
    ...(cache === undefined ? {} : { cache }),
  };

  return {
    getLeagues: () => getLeagues(context),
    getLeagueItems: (league) => getLeagueItems(league, context),
    getExchangeRatios: (league) => getExchangeRatios(league, context),
    getItemOverview: (league, type) => getItemOverview(league, type, context),
    getExchangeOverview: (league, type) =>
      getExchangeOverview(league, type, context),
  };
}
