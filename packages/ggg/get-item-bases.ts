import { fetchItems } from "./fetch-items.ts";
import type { GggContext, ItemBase } from "./types.ts";

/**
 * Every item the trade site will search on that is not a unique, from `GET /data/items` —
 * the name the game prints on the item, and the group it arrived in.
 *
 * "Base" is the endpoint's own division, not the crafting one: an entry with no `name` of
 * its own is a base, and that covers currency, divination cards, gems and maps alongside
 * the equipment bases. The group is the only thing in the payload that says which,
 * so it is kept — `category` is the id (`weapon.bow`, `card`) and `label` the heading the
 * trade site prints (`Bows`, `Cards`). Callers that want one class filter on `category`.
 *
 * A group's entries are flattened away into the rows, so the list is one pass to search.
 * Names repeat across groups where the game repeats them; nothing is deduplicated here.
 *
 * The download and its hour-keyed cache belong to `fetchItems`, which `getUniqueItems`
 * reads too — calling both in one hour costs one request.
 */
export async function getItemBases(
  context: GggContext,
): Promise<readonly ItemBase[]> {
  const groups = await fetchItems(context);

  return groups.flatMap((group) =>
    group.entries.flatMap((entry) =>
      entry.name === undefined
        ? [{ type: entry.type, category: group.id, label: group.label }]
        : [],
    ),
  );
}
