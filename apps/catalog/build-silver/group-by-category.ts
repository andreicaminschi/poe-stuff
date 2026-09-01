import { slug } from "../lake/keys.ts";
import type { Item } from "../item.ts";

/**
 * The rows split into the files they will be written as, keyed by file name.
 *
 * **One file per category. The subcategory stays a field on the row**, so a category that
 * divides finely is still one file to open and one file to read back.
 *
 * Rows inside a file are sorted by key, so a diff between two runs shows what changed
 * rather than what moved.
 */
export function groupByCategory(
  items: readonly Item[],
): ReadonlyMap<string, readonly Item[]> {
  const files = new Map<string, Item[]>();

  for (const item of items) {
    // Only a classified row reaches here, so the category is set.
    const file = `${slug(item.category ?? "unknown")}.json`;
    const rows = files.get(file);

    if (rows === undefined) files.set(file, [item]);
    else rows.push(item);
  }

  return new Map(
    [...files].map(([file, rows]) => [
      file,
      [...rows].sort((a, b) => a.key.localeCompare(b.key)),
    ]),
  );
}
