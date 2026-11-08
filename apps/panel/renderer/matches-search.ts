import type { ItemRow } from "./list-item-rows.ts";

/** Tells whether an item's row text or one of its seeders' names holds the search text. Blank matches all. */
export function matchesSearch(row: ItemRow, search: string): boolean {
  const lowered = search.trim().toLowerCase();

  if (lowered === "") return true;
  return [row.name, ...row.names].some((text) => text.toLowerCase().includes(lowered));
}
