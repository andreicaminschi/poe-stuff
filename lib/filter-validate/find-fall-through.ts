import type { FilterBlock } from "@poe/filter-eval/filter-ast";
import { checkFilter } from "./check-filter.ts";
import type { FallThroughReport, SampleCategories, SampleRow } from "./types.ts";

/** The fall-through half of `checkFilter`. */
export function findFallThrough(
  blocks: readonly FilterBlock[],
  rows: readonly SampleRow[],
  categories: SampleCategories,
): FallThroughReport {
  return checkFilter(blocks, rows, categories).fallThrough;
}
