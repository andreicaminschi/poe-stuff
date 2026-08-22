import { fanOut } from "./fan-out.ts";
import { getItemOverview } from "./get-item-overview.ts";
import { toItem } from "./to-item.ts";
import { ITEM_TYPES } from "./types.ts";
import type { ItemType, NinjaItem } from "./types.ts";

/**
 * Every priced item in one league, across all 28 item types.
 *
 * **This is the call that stands in for PoeWatch's `/compact`, and it is 28 requests
 * rather than one.** poe.ninja publishes a market per kind of item and there is no
 * endpoint that answers for the whole league, so the fan-out is the API's shape. It comes
 * to about 19 MB against `/compact`'s 21 MB, so the cost is in the request count and not
 * in the bytes.
 *
 * Each response is cached under its own hour key, which makes a re-run inside the hour
 * free and makes a partial re-run cheap: a type that failed is the only one refetched.
 *
 * **An empty type is an answer.** Four of the 28 come back with no lines at all in the
 * league this was built against — `Incubator`, `ShrineBelt`, `ImbuedGem`, `Memory` —
 * because nothing in the league traded one. A type that never answers is a different
 * thing entirely and throws, naming itself.
 *
 * Rows arrive in type order, which is `ITEM_TYPES` order, so two runs of the same hour
 * produce the same array. Every row carries the `ninjaType` it came back under, so a
 * caller wanting the fan-out's shape counts those rather than asking for the market
 * twice.
 */
export async function getLeagueItems(
  league: string,
): Promise<readonly NinjaItem[]> {
  const perType = await fanOut(ITEM_TYPES, async (type: ItemType) => {
    const lines = await getItemOverview(league, type);
    return lines.map((line) => toItem(line, type));
  });

  return perType.flat();
}
