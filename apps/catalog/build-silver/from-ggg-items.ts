import type { GGGItemGroup } from "@poe/ggg/get-item-data.types";
import { blankItem, tagSource, withValue } from "../item.ts";
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
 * A unique never resolves to an existing row — its name is its own, not a base type, and
 * matching it by name is what made the unique jewel `Wildfire` and the skill gem `Wildfire`
 * one row. It gets a row of its own, keyed by the base it rolls on with `:Name` appended:
 * `Metadata/Items/Belts/Belt3:Gluttony`. A unique that rolls on several bases is several
 * rows, because that is several ids.
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
      const name =
        entry.kind === "unique" ? entry.name : (entry.displayText ?? entry.baseType);

      if (name.trim() === "") continue;

      if (entry.kind === "unique") {
        // The base it rolls on is named, not identified, so its id is looked up the same
        // way everything else here is. A base nobody can name leaves the name as the key.
        const bases = index.get(entry.baseType) ?? [];
        const keys = bases.length === 0 ? [name] : bases.map((id) => `${id}:${name}`);

        for (const key of keys) {
          const seen = next.get(key) ?? blankItem(key, name);

          next.set(
            key,
            tagSource(
              {
                ...seen,
                name,
                tradable: true,
                isUnique: true,
                baseTypes: withValue(seen.baseTypes, entry.baseType),
              },
              "items",
            ),
          );
        }
        continue;
      }

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
