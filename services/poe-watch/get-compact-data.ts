import { call, currentHour } from "./call.ts";
import type { CompactResponse, ItemData } from "./get-compact-data.types.ts";
import type { PoeWatchContext } from "./types.ts";

/**
 * Every priced item in one league, from `GET /compact`.
 *
 * **`all=true` is not optional here, whatever the parameter is called.** Without it
 * PoeWatch answers with 13,195 rows and not one crafting base; with it, 33,144 rows, of
 * which 19,856 are the bases — and the cluster jewels, abyss jewels, talismans and
 * tinctures filed under them. The documented meaning is "all items" against "only items
 * with current data", but the bases it withholds have current data by any test: Large
 * Cluster Jewel comes back on 9,923 daily listings either way, and `GET /get` with
 * `category=bases` returns the same rows the bare call omits. So the narrow call is not a
 * freshness filter, it is a smaller answer, and every white base in the game hangs on the
 * difference. It is part of the URL and therefore part of the cache key for the same
 * reason: an entry written by the narrow call must never be read back as if it were this
 * one.
 *
 * The envelope carries nothing but `items`, so the array is what comes back.
 */
export async function getCompactData(
  league: string,
  context: PoeWatchContext,
): Promise<readonly ItemData[]> {
  const body = await call<CompactResponse>(
    `${context.baseUrl}/compact?league=${encodeURIComponent(league)}&all=true`,
    currentHour(),
    context,
  );

  return body.items;
}
