import type { Category, Draft, DraftChanges, Item } from "../../api/taxonomy/types.ts";

export type SubcategoryMove = { readonly problem: string } | { readonly changes: DraftChanges };

/** A subcategory under another category: its record moved, and every row filed there with it. */
export function moveSubcategory(draft: Draft, from: string, to: Category): SubcategoryMove {
  const [category, subcategory] = from.split("/");
  const [nextCategory, nextSubcategory] = to.path.split("/");

  if (category === undefined || subcategory === undefined) return { problem: `${from} is not a subcategory.` };
  if (nextCategory === undefined || nextSubcategory !== subcategory) return { problem: `${to.path} is not ${from} under another category.` };
  if (draft.categories[to.path] !== undefined) return { problem: `${to.path} already exists.` };

  const items = Object.fromEntries(
    Object.values(draft.items)
      .filter((item) => item.classification.category === category && item.classification.subcategory === subcategory)
      .map((item): [string, Item] => [item.key, { ...item, classification: { category: nextCategory, subcategory } }]),
  );

  return { changes: { items, categories: { [from]: null, [to.path]: to } } };
}
