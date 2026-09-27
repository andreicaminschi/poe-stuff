import type { FilterBlock, FilterItem } from "@poe/filter-eval/filter-ast";
import type { FilterMatch } from "@poe/filter-eval/match-filter";
import { pathOf } from "../samples-of/path-of.ts";
import type { SampleRow } from "../types.ts";
import type { RowOf } from "./row-lookup.ts";
import type { Hit } from "./types.ts";

export type Placement =
  | { readonly kind: "unfiltered" }
  | { readonly kind: "miss"; readonly hit: Hit }
  | { readonly kind: "won"; readonly winner: FilterBlock; readonly owners: readonly SampleRow[] };

/** Whether a sample's own path won it, and if not, who did. */
export function judgePlacement(row: SampleRow, item: FilterItem, { winner, matched }: FilterMatch, rowOf: RowOf): Placement {
  if (winner === undefined) return { kind: "unfiltered" };

  const owners = [...new Set(matched.map(rowOf))].filter((one) => one !== undefined);
  const path = pathOf(row);
  const winnerRow = rowOf(winner);

  if (!owners.some((one) => pathOf(one) === path)) {
    return { kind: "miss", hit: { bucket: "ownMiss", own: row, other: winnerRow, item } };
  }
  if (winnerRow === undefined || pathOf(winnerRow) !== path) {
    return { kind: "miss", hit: { bucket: "fallThrough", own: row, other: winnerRow, item } };
  }
  return { kind: "won", winner, owners };
}
