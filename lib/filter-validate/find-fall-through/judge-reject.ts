import type { FilterItem } from "@poe/filter-eval/filter-ast";
import type { FilterMatcher as Match } from "@poe/filter-eval/match-filter";
import { pathOf } from "../samples-of/path-of.ts";
import type { SampleRow } from "../types.ts";
import type { RowOf } from "./row-lookup.ts";
import type { Rejected } from "./types.ts";

/** A reject sample its own path takes, or nothing. */
export function judgeReject(
  row: SampleRow,
  item: FilterItem,
  reject: string,
  match: Match,
  rowOf: RowOf,
): Rejected | undefined {
  const taken = match(item).winner;
  const takenRow = rowOf(taken);
  if (taken === undefined || takenRow === undefined || pathOf(takenRow) !== pathOf(row)) return undefined;
  return { row, block: taken, reject, item };
}
