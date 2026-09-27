import type { SampleRow } from "../types.ts";

export const pathOf = <T extends Pick<SampleRow, "category" | "subcategory">>(row: T): string =>
  row.subcategory === null ? row.category : `${row.category}/${row.subcategory}`;
