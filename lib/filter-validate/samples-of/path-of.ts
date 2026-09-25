import type { SampleRow } from "../types.ts";

export const pathOf = (row: SampleRow): string =>
  row.subcategory === null ? row.category : `${row.category}/${row.subcategory}`;
