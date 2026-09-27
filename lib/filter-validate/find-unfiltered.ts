import type { FilterBlock } from "@poe/filter-eval/filter-ast";
import { checkFilter } from "./check-filter.ts";
import type { SampleCategories, SampleRow, UnfilteredReport } from "./types.ts";

/** The unfiltered half of `checkFilter`. */
export function findUnfiltered(
  blocks: readonly FilterBlock[],
  rows: readonly SampleRow[],
  categories: SampleCategories,
): UnfilteredReport {
  return checkFilter(blocks, rows, categories).unfiltered;
}
