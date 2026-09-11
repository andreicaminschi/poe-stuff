import type { Classification } from "../../api/taxonomy/types.ts";

export const pathOf = (classification: Classification): string =>
  classification.subcategory === null
    ? classification.category
    : `${classification.category}/${classification.subcategory}`;
