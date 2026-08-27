import { call } from "./call.ts";
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
 *
 * The hour goes into the cache key, so a stored answer is only ever read back inside the
 * hour that wrote it. Old files are never deleted, they only stop being asked for.
 */
export async function getStaticItems({
  limiter,
  tradeApiUrl,
  userAgent,
  cache,
  onEvent,
}: GggContext): Promise<readonly GGGStaticItem[]> {
  const response = await call<GGGStaticItemDataResponse>(
    `${tradeApiUrl}/data/static`,
    {
      userAgent,
      limiter,
      cache,
      onEvent,
      cacheSalt: String(Math.floor(Date.now() / HOUR_MS)),
    },
  );

  return response.result.flatMap(mapGGGStaticGroupDataToGGGStaticItems);
}
