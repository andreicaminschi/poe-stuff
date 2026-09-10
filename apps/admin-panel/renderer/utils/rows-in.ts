import type { Draft, Item } from "../../api/taxonomy.types.ts";

export function rowsIn(draft: Draft, path: string | undefined): readonly Item[] {
  if (path === undefined) return [];

  const [category, subcategory] = path.split("/");

  return Object.values(draft.items).filter(
    (row) =>
      row.classification.category === category &&
      (subcategory === undefined || row.classification.subcategory === subcategory),
  );
}
