import type { CatalogRow, UniqueListing } from "../types.ts";

export const listKey = (baseType: string, path: string): string => `${baseType}|${path}`;

/** Every unique listing on a base, keyed by base type and path (`regular` or `foulborn`). */
export function priceLists(rows: readonly CatalogRow[]): ReadonlyMap<string, readonly UniqueListing[]> {
  const lists = new Map<string, readonly UniqueListing[]>();

  for (const row of rows) {
    for (const group of row.uniques ?? []) {
      const path = group.subcategory ?? "regular";
      for (const baseType of row.baseTypes) {
        const key = listKey(baseType, path);
        lists.set(key, [...(lists.get(key) ?? []), ...group.listings]);
      }
    }
  }

  return lists;
}
