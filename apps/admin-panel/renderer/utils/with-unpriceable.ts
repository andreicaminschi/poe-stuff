import type { Item } from "../../api/taxonomy/types.ts";

export function withUnpriceable(item: Item, unpriceable: boolean): Item {
  if (unpriceable) return { ...item, unpriceable: true };

  const { unpriceable: _dropped, ...rest } = item;
  return rest;
}
