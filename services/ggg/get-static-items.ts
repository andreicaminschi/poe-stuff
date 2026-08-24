import { cacheKey } from "@util/core/cache-key";
import { optionalEnv } from "@util/core/env";
import { fileCache } from "@util/core/file-cache";
import { call } from "./call.ts";
import { tradeApiUrl } from "./config.ts";
import type {
  GGGStaticGroupData,
  GGGStaticItem,
  GGGStaticItemDataResponse,
} from "./get-static-items.types.ts";
import type { GggContext } from "./types.ts";

const HOUR_MS = 3_600_000;

/** The id every divider row carries. Not an item id, and not unique. */
const SEPARATOR = "sep";

export const mapGGGStaticGroupDataToGGGStaticItems = (
  data: GGGStaticGroupData,
): readonly GGGStaticItem[] =>
  data.entries.flatMap((entry) =>
    entry.id === SEPARATOR
      ? []
      : [{ ...entry, category: data.id, label: data.label }],
  );

/**
 * What the trade site loads to draw the Currency Exchange: the items it sells by name
 * rather than searching for by base type, each with the id the exchange keys its market
 * by. Mostly currency — orbs, shards, essences, fossils, oils, catalysts, scarabs — but
 * the same list also carries divination cards, beasts, unique maps and heist contracts.
 *
 * The groups are flattened and stamped onto each row, and the divider rows the site draws
 * between blocks of buttons are dropped.
 */
export async function getStaticItems({
  limiter,
  onEvent,
}: GggContext): Promise<readonly GGGStaticItem[]> {
  const root = optionalEnv("CACHE_DIR");
  const cache =
    root === undefined ? undefined : fileCache<readonly GGGStaticItem[]>(root);
  const key = cacheKey("data-static", String(Math.floor(Date.now() / HOUR_MS)));

  const cached = await cache?.get(key);
  if (cached !== undefined) return cached;

  const response = await call<GGGStaticItemDataResponse>(
    `${tradeApiUrl()}/data/static`,
    { limiter, onEvent },
  );

  const items = response.result.flatMap(mapGGGStaticGroupDataToGGGStaticItems);

  await cache?.set(key, items);

  return items;
}
