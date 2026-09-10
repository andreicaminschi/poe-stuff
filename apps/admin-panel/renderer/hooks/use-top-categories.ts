import { useMemo } from "react";
import type { CategoryNode } from "../types.ts";
import { useCategoryTree } from "./use-category-tree.ts";

export function useTopCategories(): readonly CategoryNode[] {
  const tree = useCategoryTree();

  return useMemo(() => {
    if (tree === undefined) return [];
    if (tree.excluded === undefined) return tree.nodes;

    return [...tree.nodes, tree.excluded];
  }, [tree]);
}
