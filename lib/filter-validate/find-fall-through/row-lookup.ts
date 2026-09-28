import type { FilterBlock } from "@poe/filter-eval/filter-ast";
import { readOwnerNote } from "@poe/filter-compile/owner-note";
import type { SampleRow } from "../types.ts";

export type RowOf = (block: FilterBlock | undefined) => SampleRow | undefined;

/** The row each block's note names. */
export function rowLookup(rows: readonly SampleRow[]): RowOf {
  const rowsByKey = new Map(rows.map((row) => [row.key, row]));
  const isKey = (key: string) => rowsByKey.has(key);
  return (block) => {
    const owner = block === undefined
      ? undefined
      : readOwnerNote(block.freehand, isKey);
    return owner === undefined
      ? undefined
      : rowsByKey.get(owner.key);
  };
}
