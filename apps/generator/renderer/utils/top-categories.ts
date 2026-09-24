import type { Item } from "@poe/filter-style/types";

/** The top-level categories that hold an item, Currency first. */
export function topCategories(items: readonly Item[]): readonly string[] {
  const keys = [...new Set(items.map((item) => item.category))];

  return keys.sort((a, b) => Number(b === "Currency") - Number(a === "Currency") || a.localeCompare(b));
}
