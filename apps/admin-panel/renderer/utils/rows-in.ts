import type { Draft, Item } from "../../api/taxonomy.types.ts";
import type { View } from "../types.ts";

export function rowsIn(draft: Draft, path: string | undefined, view: View): readonly Item[] {
  const excluded = view === "excluded";
  const inView = Object.values(draft.items).filter((row) => (row.excluded === true) === excluded);

  if (path === undefined) return inView;

  const [category, subcategory] = path.split("/");

  return inView.filter(
    (row) =>
      row.classification.category === category &&
      (subcategory === undefined || row.classification.subcategory === subcategory),
  );
}
