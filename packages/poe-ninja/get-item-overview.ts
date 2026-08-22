import { GAME_PATH } from "./config.ts";
import { fetchJson } from "./fetch-json.ts";
import type { ItemOverviewLine, ItemOverviewResponse, ItemType } from "./types.ts";

/**
 * One league's rows for one item `type`, from
 * `GET /poe1/api/economy/stash/current/item/overview`.
 *
 * The `type` is the request and it is also the only honest answer to *what is this row* —
 * see `item-types.ts` for why `itemClass` is not. So this returns the lines raw and the
 * caller pairs them back up with the type it asked for.
 *
 * An empty `lines` array is a valid answer. Four of the 28 types are empty in the league
 * this was built against, because nothing in that league traded one.
 *
 * The envelope carries nothing but `lines`, so the array is what comes back.
 */
export async function getItemOverview(
  league: string,
  type: ItemType,
): Promise<readonly ItemOverviewLine[]> {
  const body = await fetchJson<ItemOverviewResponse>(
    `${GAME_PATH}/api/economy/stash/current/item/overview`,
    { league, type },
  );

  return body.lines ?? [];
}
