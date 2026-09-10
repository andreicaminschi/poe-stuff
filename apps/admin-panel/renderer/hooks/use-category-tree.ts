import { useMemo } from "react";
import { useSession } from "../session-store.ts";
import type { CategoryTree } from "../types.ts";
import { categoryTree } from "../utils/category-tree.ts";
import { useDraft } from "./use-draft.ts";

export function useCategoryTree(): CategoryTree | undefined {
  const draft = useDraft();
  const view = useSession((state) => state.view);

  return useMemo(() => (draft === undefined ? undefined : categoryTree(draft, view)), [draft, view]);
}
