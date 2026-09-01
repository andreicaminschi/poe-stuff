import type { BaseItem, BaseItems } from "@poe/repoe/get-base-items.types";
import { blankItem, tagSource, withValue } from "../item.ts";
import type { Item } from "../item.ts";

/**
 * The game's own data, applied last so that it is the last word on any row.
 *
 * Several metadata ids can share one name — legacy map art, a currency that was reissued —
 * and the first one wins. The rows they disagree on are the same item at different points
 * in the game's history, so the class, the tags and the release state come out the same
 * either way; what differs is the path, and every path is kept.
 *
 * A base RePoE knows that nothing else mentioned still gets a row. The catalog is one row
 * per item the game can show, not one row per item somebody listed for sale.
 */
export function fromRepoe(
  items: ReadonlyMap<string, Item>,
  baseItems: BaseItems,
): ReadonlyMap<string, Item> {
  const next = new Map(items);

  for (const [path, base] of Object.entries(baseItems)) {
    if (base.name.trim() === "") continue;

    const seen = next.get(base.name) ?? blankItem(base.name);

    next.set(base.name, tagSource(filled(seen, base, path), "repoe"));
  }

  return next;
}

const filled = (item: Item, base: BaseItem, path: string): Item => ({
  ...item,
  name: item.name ?? base.name,
  metadataPaths: withValue(item.metadataPaths, path),
  itemClass: item.itemClass ?? base.item_class,
  releaseState: item.releaseState ?? base.release_state,
  tags: item.tags.length === 0 ? [...base.tags] : item.tags,
});
