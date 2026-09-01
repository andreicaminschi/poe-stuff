import type { GGGItemGroup } from "@poe/ggg/get-item-data.types";
import { blankItem, tagSource, withValue } from "../item.ts";
import type { Item } from "../item.ts";

/**
 * A row for every name the trade site will let you search for.
 *
 * A unique is listed once per base it can roll on, and a transfigured gem or a blighted map
 * carries its own name in `displayText` while sharing a base type with the ordinary item.
 * Both fold into one row per name, which is why the map is read back as it is filled.
 *
 * The category is left null here. Nothing on this payload says which category a name
 * belongs to in the taxonomy's vocabulary, and guessing from the group would put two
 * different answers on one row.
 */
export function fromGGGItems(
  groups: readonly GGGItemGroup[],
): ReadonlyMap<string, Item> {
  const items = new Map<string, Item>();

  for (const group of groups) {
    for (const entry of group.items) {
      const name =
        entry.kind === "unique" ? entry.name : (entry.displayText ?? entry.baseType);

      if (name.trim() === "") continue;

      const seen = items.get(name) ?? blankItem(name);
      const item = tagSource(seen, "items");

      items.set(
        name,
        entry.kind === "unique"
          ? {
              ...item,
              isUnique: true,
              baseTypes: withValue(item.baseTypes, entry.baseType),
            }
          : item,
      );
    }
  }

  return items;
}
