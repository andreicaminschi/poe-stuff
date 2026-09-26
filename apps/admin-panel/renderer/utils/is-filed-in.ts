import type { Item } from "../../api/taxonomy/types.ts";

/** Whether a row sits under `category` or `category/subcategory`. */
export function isFiledIn(row: Item, path: string): boolean {
  const [category, subcategory] = path.split("/");

  return (
    row.classification.category === category &&
    (subcategory === undefined || row.classification.subcategory === subcategory)
  );
}
