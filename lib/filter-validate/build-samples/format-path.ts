import type { SampleRow } from "../types.ts";

/** Joins a row's category and subcategory into its taxonomy path, like `gems/skill`. */
export const formatPath = <T extends Pick<SampleRow, "category" | "subcategory">>(row: T): string =>
  row.subcategory === null
    ? row.category
    : `${row.category}/${row.subcategory}`;
