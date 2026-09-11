import type { Item } from "../../api/taxonomy/types.ts";

export function withExcluded(item: Item, excluded: boolean): Item {
  if (excluded) return { ...item, excluded: true };

  const { excluded: _dropped, ...rest } = item;
  return rest;
}
