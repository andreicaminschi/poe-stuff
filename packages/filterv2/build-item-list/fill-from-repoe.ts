import type { BaseItems } from "@poe/repoe/get-base-items.types";
import { tagSource } from "../types.ts";
import type { Item, ItemsByKey } from "../types.ts";

/**
 * What the game's own data knows about rows the other sources already created.
 *
 * **It runs last, and it wins.** The trade site and the forum each guess an item's class
 * from where they happened to mention it; RePoE is the game's own export. Running it after
 * the post is what makes that precedence structural instead of a `??` in one branch of
 * `addNewItems`.
 *
 * It adds no rows. RePoE covers every base, unreleased and legacy ones included, and an
 * item nothing sells and nobody can drop is not something a filter needs a line for.
 *
 * A name is not unique in RePoE, so the first base to claim one wins. The rows that
 * collide are placeholders with no name at all, and none of those match a row here.
 */
export function fillFromRepoe(
  items: ItemsByKey,
  baseItems: BaseItems,
): ItemsByKey {
  const byName = new Map<string, BaseItems[string]>();
  for (const base of Object.values(baseItems)) {
    if (!byName.has(base.name)) byName.set(base.name, base);
  }

  const next = new Map<string, Item>();

  for (const [key, item] of items) {
    const base = item.name === null ? undefined : byName.get(item.name);

    next.set(
      key,
      base === undefined
        ? item
        : tagSource(
            {
              ...item,
              itemClass: base.item_class,
              releaseState: base.release_state,
              tags: [...base.tags],
            },
            "repoe",
          ),
    );
  }

  return next;
}
