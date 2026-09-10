import type { DraftChanges } from "../../api/taxonomy.types.ts";
import type { Changes } from "../types.ts";

export const toDraftChanges = (changes: Changes): DraftChanges => ({
  ...(Object.keys(changes.items).length === 0 ? {} : { items: changes.items }),
  ...(Object.keys(changes.categories).length === 0 ? {} : { categories: changes.categories }),
});
