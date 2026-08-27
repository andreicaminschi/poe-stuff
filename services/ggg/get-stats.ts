import { call } from "./call.ts";
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
 *
 * The hour goes into the cache key, so a stored answer is only ever read back inside the
 * hour that wrote it. Old files are never deleted, they only stop being asked for.
 */
export async function getStats({
  limiter,
  tradeApiUrl,
  userAgent,
  cache,
  onEvent,
}: GggContext): Promise<readonly GGGStat[]> {
  const response = await call<GGGStatDataResponse>(`${tradeApiUrl}/data/stats`, {
    userAgent,
    limiter,
    cache,
    onEvent,
    cacheSalt: String(Math.floor(Date.now() / HOUR_MS)),
  });

  return response.result.flatMap((group) =>
    group.entries.map(mapGGGStatDataToGGGStat),
  );
}
