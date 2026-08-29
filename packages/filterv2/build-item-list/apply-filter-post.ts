import { addNewItems } from "./add-new-items.ts";
import { renameItems } from "./rename-items.ts";
import type { Item, ItemsByKey, ProcessedPost } from "../types.ts";

/** What the newest post changes about the item list the two truths built. */
export function applyFilterPost(
  items: ItemsByKey,
  post: ProcessedPost,
  missingNames: readonly string[],
): ItemsByKey {
  const renamed = renameItems(items, post);
  const removed = new Set(post.removed);

  const kept = new Map<string, Item>(
    [...renamed].filter(([key]) => !removed.has(key)),
  );

  return addNewItems(kept, post, missingNames);
}
