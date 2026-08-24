import { cacheKey } from "@util/core/cache-key";
import { optionalEnv } from "@util/core/env";
import { fileCache } from "@util/core/file-cache";
import { call } from "./call.ts";
import { tradeApiUrl } from "./config.ts";
import type {
  GGGStat,
  GGGStatData,
  GGGStatDataResponse,
} from "./get-stats.types.ts";
import type { GggContext } from "./types.ts";

const HOUR_MS = 3_600_000;

export const mapGGGStatDataToGGGStat = (data: GGGStatData): GGGStat => ({
  id: data.id,
  text: data.text,
  type: data.type,
  ...(data.option === undefined ? {} : { options: data.option.options }),
});

/**
 * The modifier list the trade site loads to populate its stat filters: every line it will
 * let you search on, with each rolled number written as `#`. Explicit, implicit, enchant,
 * fractured and crafted mods, plus the pseudo stats the site derives rather than reads off
 * an item.
 *
 * The groups are flattened, since each stat repeats its group in `type`.
 */
export async function getStats({
  limiter,
  onEvent,
}: GggContext): Promise<readonly GGGStat[]> {
  const root = optionalEnv("CACHE_DIR");
  const cache =
    root === undefined ? undefined : fileCache<readonly GGGStat[]>(root);
  const key = cacheKey("trade-stats", String(Math.floor(Date.now() / HOUR_MS)));

  const cached = await cache?.get(key);
  if (cached !== undefined) return cached;

  const response = await call<GGGStatDataResponse>(
    `${tradeApiUrl()}/data/stats`,
    { limiter, onEvent },
  );

  const stats = response.result.flatMap((group) =>
    group.entries.map(mapGGGStatDataToGGGStat),
  );

  await cache?.set(key, stats);

  return stats;
}
