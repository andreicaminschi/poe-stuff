import { tagSource } from "../types.ts";
import type { Item, ItemsByKey, ProcessedPost } from "../types.ts";

/**
 * `"Dark Pact" renamed to "Dark Bargain"`.
 *
 * A renamed row is not a missing row, and no model has to guess at it: the post says both
 * halves. The old name stays on the row so a filter written against it can be traced.
 *
 * Every move is read off the list handed in, never off the list being built. The post
 * renames names into each other — Glace becomes Fragment of Winter, and Fragment of Winter
 * becomes something else — so reading back a half-built list would rename one row twice.
 */
export function renameItems(
  items: ItemsByKey,
  post: ProcessedPost,
): ItemsByKey {
  const moves = post.renamed
    .map(({ from, to }) => ({ from, to, item: items.get(from) }))
    .filter((move): move is { from: string; to: string; item: Item } =>
      move.item !== undefined,
    );

  if (moves.length === 0) return items;

  const gone = new Set(moves.map((move) => move.from));
  const next = new Map<string, Item>(
    [...items].filter(([key]) => !gone.has(key)),
  );

  for (const { from, to, item } of moves) {
    next.set(to, tagSource({ ...item, key: to, name: to, renamedFrom: from }, "forum"));
  }

  return next;
}
