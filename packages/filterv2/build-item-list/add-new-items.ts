import { blankItem, tagSource } from "../types.ts";
import type { Item, ItemsByKey, ProcessedPost } from "../types.ts";

/**
 * The item list, plus the items the post names that RePoE has never heard of.
 *
 * These are the new league's items, and this is the only place they are written down: the
 * trade site waits for a listing, RePoE waits for a patch. A maintainer wants every one of
 * them highlighted whether or not it ever reaches the exchange, so `isNew` is set on all of
 * them and not only on the ones that trade.
 */
export function addNewItems(
  items: ItemsByKey,
  post: ProcessedPost,
  missingNames: readonly string[],
): ItemsByKey {
  const missing = new Set(missingNames);
  const next = new Map<string, Item>(items);

  for (const group of post.newItems) {
    for (const name of group.names) {
      if (!missing.has(name)) continue;

      const seen = next.get(name) ?? blankItem(name);

      next.set(
        name,
        tagSource(
          {
            ...seen,
            itemClass: seen.itemClass ?? group.itemClass,
            isNew: true,
          },
          "forum",
        ),
      );
    }
  }

  return next;
}
