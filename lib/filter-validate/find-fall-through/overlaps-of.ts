import type { FilterItem } from "@poe/filter-eval/filter-ast";
import { pathOf } from "../samples-of/path-of.ts";
import type { SampleCategories, SampleRow } from "../types.ts";
import type { Hit } from "./types.ts";

function isCatchAll(categories: SampleCategories, own: SampleRow, other: SampleRow): boolean {
  return other.category === own.category && categories[pathOf(other)]?.catchAll === true;
}

/** One hit per other non-catch-all path that also matched. */
export function overlapsOf(
  row: SampleRow,
  owners: readonly SampleRow[],
  item: FilterItem,
  categories: SampleCategories,
): readonly Hit[] {
  const path = pathOf(row);
  const others = new Map(owners.filter((one) => pathOf(one) !== path).map((one) => [pathOf(one), one]));
  return [...others.values()]
    .filter((other) => !isCatchAll(categories, row, other))
    .map((other) => ({ bucket: "overlap", own: row, other, item }));
}
