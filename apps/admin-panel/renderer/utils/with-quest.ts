import type { Item } from "../../api/taxonomy/types.ts";

export function withQuest(item: Item, quest: boolean): Item {
  if (quest) return { ...item, quest: true };

  const { quest: _dropped, ...rest } = item;
  return rest;
}
