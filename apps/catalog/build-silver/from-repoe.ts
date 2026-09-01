import type { BaseItems } from "@poe/repoe/get-base-items.types";
import { blankItem, tagSource } from "../item.ts";
import type { Item } from "../item.ts";

/**
 * A row per base item, keyed by its metadata id.
 *
 * **The id is the key, not the name.** Several bases share a display name — an incubator
 * that stacks and one that does not, a resonator socketable two ways, the skill gem and the
 * unique jewel both called `Wildfire` — and keying by name folded them into one row that
 * belonged to neither. The metadata id is the only identity the game's data gives, so it is
 * what a row is addressed by.
 *
 * This runs first and it is the only thing that invents a row from `base_items.json`. Every
 * later source either fills a row that is already here or adds one under its own id.
 */
/**
 * Bases belonging to Royale, the battle-royale mode the game no longer runs.
 *
 * **A string match on the id, and nothing better exists.** They are `release_state:
 * "released"` like everything else, they inherit from the ordinary abstract base, and only
 * eight of them carry `not_for_sale` — a tag 769 real items carry too, 414 of them maps.
 *
 * Every one of them duplicates the name of a base that does drop, so keeping them meant two
 * `Leather Belt` rows and two of every unique that rolls on one. They are 165 of the 417
 * duplicated names in the export, and no name is lost by dropping them.
 */
const ROYALE = /Royale/i;

export function fromRepoe(baseItems: BaseItems): ReadonlyMap<string, Item> {
  const rows = new Map<string, Item>();

  for (const [id, base] of Object.entries(baseItems)) {
    if (base.name.trim() === "" || ROYALE.test(id)) continue;

    rows.set(
      id,
      tagSource(
        {
          ...blankItem(id, base.name),
          metadataPaths: [id],
          itemClass: base.item_class,
          releaseState: base.release_state,
          tags: [...base.tags],
        },
        "repoe",
      ),
    );
  }

  return rows;
}
