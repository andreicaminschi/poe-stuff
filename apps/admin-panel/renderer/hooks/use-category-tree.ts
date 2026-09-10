import { useMemo } from "react";
import type { CategoryTree } from "../types.ts";
import { categoryTree } from "../utils/category-tree.ts";
import { useDraft } from "./use-draft.ts";

export function useCategoryTree(): CategoryTree | undefined {
  const draft = useDraft();

  return useMemo(() => (draft === undefined ? undefined : categoryTree(draft)), [draft]);
}
