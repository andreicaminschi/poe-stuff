import type { Category, Draft, DraftChanges, Item } from "../../api/taxonomy/types.ts";
import { newCategoryProblem } from "./new-category-problem.ts";

export type CategoryRename = { readonly problem: string } | { readonly changes: DraftChanges };

/** A category or subcategory under a new slug: its records moved, and every row filed there with it. */
export function renameCategory(draft: Draft, from: string, to: Category): CategoryRename {
  const [category = "", subcategory] = from.split("/");
  const [nextCategory = "", nextSubcategory] = to.path.split("/");
  const sub = subcategory !== undefined;

  if (to.path === from) return { problem: `${from} already has that slug.` };
  if (sub !== (nextSubcategory !== undefined) || (sub && nextCategory !== category)) {
    return { problem: `${to.path} is not ${from} under a new slug.` };
  }

  const taken =
    draft.categories[to.path] !== undefined ||
    Object.keys(draft.categories).some((path) => path.startsWith(`${to.path}/`)) ||
    Object.values(draft.items).some(
      (item) =>
        item.classification.category === nextCategory &&
        (nextSubcategory === undefined || item.classification.subcategory === nextSubcategory),
    );
  const problem = newCategoryProblem(to.path.split("/").at(-1) ?? "", to.path, taken);
  if (problem !== undefined) return { problem };

  const items = Object.fromEntries(
    Object.values(draft.items)
      .filter((item) => item.classification.category === category && (!sub || item.classification.subcategory === subcategory))
      .map((item): [string, Item] => [
        item.key,
        {
          ...item,
          classification: sub
            ? { category, subcategory: nextSubcategory ?? null }
            : { ...item.classification, category: nextCategory },
        },
      ]),
  );

  const children = sub ? [] : Object.entries(draft.categories).filter(([path]) => path.startsWith(`${from}/`));
  const categories = {
    [from]: null,
    ...Object.fromEntries(children.map(([path]) => [path, null])),
    ...Object.fromEntries(
      children.map(([path, record]): [string, Category] => {
        const next = `${to.path}${path.slice(from.length)}`;
        return [next, { ...record, path: next }];
      }),
    ),
    [to.path]: to,
  };

  return { changes: { items, categories } };
}
