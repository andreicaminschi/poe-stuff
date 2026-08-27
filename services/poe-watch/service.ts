import {
  DEFAULT_BASE_URL,
  DEFAULT_USER_AGENT,
  trimUrl,
} from "./config.ts";
import { getCompactData } from "./get-compact-data.ts";
import type { ItemData } from "./get-compact-data.types.ts";
import { getCorruptionData } from "./get-corruption-data.ts";
import type { ItemCorruptions } from "./get-corruption-data.types.ts";
import { getExchangeRatios } from "./get-exchange-ratios.ts";
import type {
  ExchangeRatioItem,
  Game,
} from "./get-exchange-ratios.types.ts";
import type { ResponseCache } from "./types.ts";

export type PoeWatchServiceOptions = {
  /** Base of the PoeWatch API. Defaults to `https://api.poe.watch`. */
  baseUrl?: string;
  /** Sent as `user-agent` on every request. Defaults to `poe-stuff/1.0`. */
  userAgent?: string;
  /**
   * Absent by default, which means every call re-downloads tens of megabytes. Handing one
   * over is the whole switch.
   */
  cache?: ResponseCache;
};

export type PoeWatchService = {
  getCompactData(league: string): Promise<readonly ItemData[]>;
  getCorruptionData(league: string): Promise<readonly ItemCorruptions[]>;
  getExchangeRatios(
    league: string,
    game: Game,
  ): Promise<readonly ExchangeRatioItem[]>;
};

/**
 * PoeWatch behind one object.
 *
 * **Not GGG and not the wiki.** This is a third party scraping trade listings, which is
 * why a price from here is what somebody asked for an item rather than what one sold for.
 * PoeWatch publishes no rate limits and nothing here draws on the GGG budget, so there is
 * no limiter and no reason to build only one of these per process — unlike `@poe/ggg`,
 * where a second service is a second helping of one IP's budget.
 */
export function createPoeWatchService({
  baseUrl = DEFAULT_BASE_URL,
  userAgent = DEFAULT_USER_AGENT,
  cache,
}: PoeWatchServiceOptions = {}): PoeWatchService {
  const context = {
    baseUrl: trimUrl(baseUrl),
    userAgent,
    ...(cache === undefined ? {} : { cache }),
  };

  return {
    getCompactData: (league) => getCompactData(league, context),
    getCorruptionData: (league) => getCorruptionData(league, context),
    getExchangeRatios: (league, game) =>
      getExchangeRatios(league, game, context),
  };
}
