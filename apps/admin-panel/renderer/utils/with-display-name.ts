import type { Item } from "../../api/taxonomy/types.ts";

/** A plain item's name edits its display name, so RePoE's `name` never changes. */
export const withDisplayName = (item: Item, value: string): Item =>
  item.source === "ggg" ? { ...item, displayName: value } : { ...item, name: value };
