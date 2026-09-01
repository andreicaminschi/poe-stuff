import { tagSource } from "../item.ts";
import type { Item, ItemSource } from "../item.ts";

/**
 * Records that another table names the same metadata ids.
 *
 * **It adds no rows.** A table like the essence export is keyed by ids `base_items.json`
 * already holds, so its only news is that a second source knows the row. An id it names
 * that nothing else has is a row the catalog has no name for, and inventing one from a
 * table that carries no base type is how phantom items got in before.
 */
export function tagIds(
  rows: ReadonlyMap<string, Item>,
  ids: Iterable<string>,
  source: ItemSource,
): ReadonlyMap<string, Item> {
  const next = new Map(rows);

  for (const id of ids) {
    const seen = next.get(id);
    if (seen === undefined) continue;

    next.set(id, tagSource(seen, source));
  }

  return next;
}
