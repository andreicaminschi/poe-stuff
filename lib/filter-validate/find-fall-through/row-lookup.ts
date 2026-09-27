import type { FilterBlock } from "@poe/filter-eval/filter-ast";
import type { SampleRow } from "../types.ts";
import { ownerOf } from "./owner-of.ts";

export type RowOf = (block: FilterBlock | undefined) => SampleRow | undefined;

/** The row each block's note names. */
export function rowLookup(rows: readonly SampleRow[]): RowOf {
  const rowsByKey = new Map(rows.map((row) => [row.key, row]));
  return (block) => {
    const key = block === undefined ? undefined : ownerOf(block);
    return key === undefined ? undefined : rowsByKey.get(key);
  };
}
