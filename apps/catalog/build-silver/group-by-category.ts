import { slug } from "../lake/keys.ts";
import type { Item } from "../item.ts";

/**
 * The rows split by the category the taxonomy gave them, keyed by the slug a file is named
 * after.
 *
 * **One group per category. The subcategory stays a field on the row**, so a category that
 * divides finely is still one file to open and one file to read back.
 *
 * Rows inside a group are sorted by display name, with the key breaking ties — two rows can
 * share a name now that each metadata id is its own row. A diff between two runs then shows
 * what changed rather than what moved.
 */
export function groupByCategory(
  items: readonly Item[],
): ReadonlyMap<string, readonly Item[]> {
  const groups = new Map<string, Item[]>();

  for (const item of items) {
    // Only a classified row reaches here, so the category is set.
    const category = slug(item.category ?? "unknown");
    const rows = groups.get(category);

    if (rows === undefined) groups.set(category, [item]);
    else rows.push(item);
  }

  return new Map(
    [...groups].map(([category, rows]) => [
      category,
      [...rows].sort(
        (a, b) =>
          (a.name ?? a.key).localeCompare(b.name ?? b.key) ||
          a.key.localeCompare(b.key),
      ),
    ]),
  );
}
