import type { Gems } from "@poe/repoe/get-gems.types";
import { blankItem, tagSource } from "../item.ts";
import type { Item } from "../item.ts";

/**
 * A row per gem variant, keyed by the variant's metadata id.
 *
 * A transfigured gem has an id of its own and no row in `base_items.json`, so this is the
 * only place it comes from. An ordinary gem shares its id with the base and merges into the
 * row that is already there.
 *
 * **The name comes from `baseTypeName`, never from `name`.** A support gem is named in this
 * table by its skill — `Gluttony`, where the item is `Gluttony Support` — and carries no
 * `baseTypeName` at all, so it is skipped here and left to `base_items.json`, which names
 * the item properly.
 */
export function fromGems(
  rows: ReadonlyMap<string, Item>,
  gems: Gems,
): ReadonlyMap<string, Item> {
  const next = new Map(rows);

  for (const [id, gem] of Object.entries(gems)) {
    if (gem.baseTypeName === undefined) continue;

    const seen = next.get(id) ?? {
      ...blankItem(id, gem.baseTypeName),
      metadataPaths: [id],
    };

    next.set(id, tagSource(seen, "repoe-gems"));
  }

  return next;
}
