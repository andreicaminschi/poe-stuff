import { describe, expect, it } from "@jest/globals";
import type { FilterItem } from "@poe/filter-eval/filter-ast";
import type { FilterMatcher } from "@poe/filter-eval/match-filter";
import { findBlockEntries } from "./find-block-entries.ts";
import type { EntryRow, MarketEntry } from "./types.ts";

const entry = (id: number, name = "x"): MarketEntry => ({ source: "poeWatch:items", id, name });
const winning = (freehand: string | undefined): FilterMatcher =>
  (() => ({ winner: freehand === undefined
    ? undefined
    : { freehand } })) as unknown as FilterMatcher;

const ring: EntryRow = {
  key: "Ring",
  name: "Ruby Ring",
  poeWatch: entry(1),
  variants: [{ name: "ilvl 84", poeWatch: entry(2) }, { name: "bare" }],
};
const rowsByKey = new Map([["Ring", ring]]);
const rare = { Rarity: "Rare" } as FilterItem;

describe("findBlockEntries", () => {
  it("finds the entry of the row of the block that takes it", () => {
    expect(findBlockEntries(rare, winning("Ring"), rowsByKey)).toEqual([entry(1)]);
  });

  it("finds the variant entry when the block note names one, including a name with spaces", () => {
    expect(findBlockEntries(rare, winning("Ring ilvl 84"), rowsByKey)).toEqual([entry(2)]);
  });

  it("finds nothing when the variant has no market entry", () => {
    expect(findBlockEntries(rare, winning("Ring bare"), rowsByKey)).toEqual([]);
  });

  it("finds nothing when no block takes the item", () => {
    expect(findBlockEntries(rare, winning(undefined), rowsByKey)).toEqual([]);
  });

  it("finds nothing when the block names a row it does not know", () => {
    expect(findBlockEntries(rare, winning("Amulet"), rowsByKey)).toEqual([]);
  });
});
