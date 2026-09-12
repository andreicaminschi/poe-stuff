import { useMemo } from "react";
import { resolveForms } from "@poe/filter-compile/resolve-row";
import type { Item, Resolution } from "../../api/taxonomy/types.ts";
import { fromValues } from "../utils/from-values.ts";
import { useDraft } from "./use-draft.ts";

/** The item's forms as the working version resolves them: saved, ledger and unsaved edits together. */
export function useItemResolution(item: Item | undefined): readonly Resolution[] | undefined {
  const draft = useDraft();

  return useMemo(() => {
    if (draft === undefined || item === undefined) return undefined;

    return resolveForms(
      draft.categories,
      {
        ...fromValues(item),
        category: item.classification.category,
        subcategory: item.classification.subcategory,
        conditions: item.conditions,
      },
      item.variants,
    ).map((form) => ({ key: item.key, ...form }));
  }, [draft, item]);
}
