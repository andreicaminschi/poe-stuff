import type { GGGItemGroup } from "@poe/ggg/get-item-data.types";
import { blankItem, tagSource } from "../item.ts";
import type { Item } from "../item.ts";

/** Display name to the ids of every row carrying it. A name is not unique; an id is. */
function byName(rows: ReadonlyMap<string, Item>): ReadonlyMap<string, string[]> {
  const index = new Map<string, string[]>();

  for (const [id, item] of rows) {
    if (item.name === null) continue;

    const seen = index.get(item.name);
    if (seen === undefined) index.set(item.name, [id]);
    else seen.push(id);
  }

  return index;
}

/**
 * Marks what the trade site will let you search for.
 *
 * **This adds nothing the game's data already names.** It carries no metadata id — the
 * payload is names and nothing else — so a name is looked up against the rows the game's own
 * data built, and every row carrying that name is marked `tradable`. A name shared by two
 * ids marks both, which is right: the trade site cannot tell them apart either.
 *
 * **A unique makes no row.** On the ground a unique is its base with a rarity, and a filter
 * names the base; so the base carries its uniques, under `uniques`, and `with-uniques.ts`
 * reads the same groups to find which base each one rolls on. Nothing here is marked by a
 * unique's name — `Wildfire` the unique jewel must not make `Wildfire` the gem tradable.
 *
 * A name the game's data does not have gets a name-keyed row. Blighted maps, the trade
 * site's `Chart (Abyssal Plain)` labels and the beast species all arrive that way, and all
 * of them are skipped.
 */
export function fromGGGItems(
  rows: ReadonlyMap<string, Item>,
  groups: readonly GGGItemGroup[],
): ReadonlyMap<string, Item> {
  const next = new Map(rows);
  const index = byName(rows);

  for (const group of groups) {
    for (const entry of group.items) {
      if (entry.kind === "unique") continue;

      const name = entry.displayText ?? entry.baseType;

      if (name.trim() === "") continue;

      const ids = index.get(name);

      if (ids === undefined) {
        const seen = next.get(name) ?? blankItem(name);
        next.set(name, tagSource({ ...seen, tradable: true }, "items"));
        continue;
      }

      for (const id of ids) {
        const seen = next.get(id);
        if (seen === undefined) continue;

        next.set(id, tagSource({ ...seen, tradable: true }, "items"));
      }
    }
  }

  return next;
}
