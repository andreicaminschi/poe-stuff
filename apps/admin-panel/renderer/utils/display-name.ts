import type { Item } from "../../api/taxonomy/types.ts";

/** The name the panel shows: a plain item's own name when it has one, else RePoE's. */
export function displayName(item: Item): string {
  if (item.source === "authored") return item.name;

  return item.displayName === undefined || item.displayName.trim() === "" ? item.name : item.displayName;
}
