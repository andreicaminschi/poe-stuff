import { useMemo } from "react";
import type { CategoryNode } from "../types.ts";
import { categoryTree } from "../utils/category-tree.ts";
import { useDraft } from "./use-draft.ts";

export function useTopCategories(): readonly CategoryNode[] {
  const draft = useDraft();

  return useMemo(() => (draft === undefined ? [] : categoryTree(draft).nodes), [draft]);
}
