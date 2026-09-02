import { DEFAULT_BASE_URL, DEFAULT_USER_AGENT, trimUrl } from "./config.ts";
import { getBaseItems } from "./get-base-items.ts";
import type { BaseItems } from "./get-base-items.types.ts";
import { getClusterJewels } from "./get-cluster-jewels.ts";
import type { ClusterJewels } from "./get-cluster-jewels.types.ts";
import { getEssences } from "./get-essences.ts";
import type { Essences } from "./get-essences.types.ts";
import { getFoulbornMap } from "./get-foulborn-map.ts";
import type { FoulbornMap } from "./get-foulborn-map.types.ts";
import { getGems } from "./get-gems.ts";
import type { Gems } from "./get-gems.types.ts";
import { getSpectres } from "./get-spectres.ts";
import type { Spectres } from "./get-spectres.types.ts";
import type { ResponseCache } from "./types.ts";

export type RepoeServiceOptions = {
  /** Base of the RePoE site. Defaults to `https://repoe-fork.github.io`. */
  baseUrl?: string;
  /** Sent as `user-agent` on every request. Defaults to `poe-stuff/1.0`. */
  userAgent?: string;
  /**
   * Absent by default, which means every call re-downloads the whole export. Handing one
   * over is the whole switch.
   */
  cache?: ResponseCache;
};

export type RepoeService = {
  getBaseItems(): Promise<BaseItems>;
  getGems(): Promise<Gems>;
  getSpectres(): Promise<Spectres>;
  getEssences(): Promise<Essences>;
  getClusterJewels(): Promise<ClusterJewels>;
  getFoulbornMap(): Promise<FoulbornMap>;
};

/**
 * RePoE behind one object.
 *
 * **Not GGG.** RePoE is a community export of the game's own data files, served as static
 * JSON from GitHub Pages. Nothing here draws on the GGG budget, so there is no limiter and
 * no reason to build only one of these per process — unlike `@poe/ggg`, where a second
 * service is a second helping of one IP's budget.
 */
export function createRepoeService({
  baseUrl = DEFAULT_BASE_URL,
  userAgent = DEFAULT_USER_AGENT,
  cache,
}: RepoeServiceOptions = {}): RepoeService {
  const context = {
    baseUrl: trimUrl(baseUrl),
    userAgent,
    ...(cache === undefined ? {} : { cache }),
  };

  return {
    getBaseItems: () => getBaseItems(context),
    getGems: () => getGems(context),
    getSpectres: () => getSpectres(context),
    getEssences: () => getEssences(context),
    getClusterJewels: () => getClusterJewels(context),
    getFoulbornMap: () => getFoulbornMap(context),
  };
}
