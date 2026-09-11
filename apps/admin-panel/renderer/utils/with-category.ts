import type { Category } from "../../api/taxonomy/types.ts";
import type { Changes } from "../types.ts";

export const withCategory = (changes: Changes, path: string, category: Category | null): Changes => ({
  ...changes,
  categories: { ...changes.categories, [path]: category },
});
