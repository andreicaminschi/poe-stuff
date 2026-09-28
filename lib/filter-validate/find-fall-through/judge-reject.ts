import type { FilterBlock, FilterItem } from "@poe/filter-eval/filter-ast";
import { formatPath } from "../build-samples/format-path.ts";
import type { SampleRow } from "../types.ts";
import type { RowOf } from "./row-lookup.ts";
import type { Rejected } from "./types.ts";

/** A reject sample its own path takes, or nothing. */
export function judgeReject(
  row: SampleRow,
  item: FilterItem,
  reject: string,
  winner: FilterBlock | undefined,
  rowOf: RowOf,
): Rejected | undefined {
  const takenRow = rowOf(winner);
  if (winner === undefined || takenRow === undefined || formatPath(takenRow) !== formatPath(row)) return undefined;
  return { row, block: winner, reject, item };
}
