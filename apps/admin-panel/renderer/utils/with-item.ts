import type { Item } from "../../api/taxonomy.types.ts";
import type { Changes } from "../types.ts";

export const withItem = (changes: Changes, item: Item): Changes => ({
  ...changes,
  items: { ...changes.items, [item.key]: item },
});
