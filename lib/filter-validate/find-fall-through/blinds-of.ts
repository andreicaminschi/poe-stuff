import type { FilterBlock, FilterItem } from "@poe/filter-eval/filter-ast";
import type { SampleRow } from "../types.ts";
import type { Blind } from "./types.ts";

/** Each varied property the sample holds that the winning block never asks. */
export function blindsOf(
  row: SampleRow,
  winner: FilterBlock,
  item: FilterItem,
  varied: readonly string[],
): readonly Blind[] {
  return varied
    .filter((property) => property in item && !winner.conditions.some((one) => one.name === property))
    .map((property) => ({ row, block: winner, property, item }));
}
