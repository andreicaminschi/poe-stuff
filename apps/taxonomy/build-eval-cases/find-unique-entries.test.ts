import { describe, expect, it } from "@jest/globals";
import type { FilterItem } from "@poe/filter-eval/filter-ast";
import { findUniqueEntries } from "./find-unique-entries.ts";
import type { EntryRow, MarketEntry } from "./types.ts";

const entry = (id: number, name = "x"): MarketEntry => ({ source: "poeWatch:items", id, name });

const ring: EntryRow = {
  key: "Ring",
  name: "Ruby Ring",
  uniques: [
    {
      subcategory: null,
      listings: [
        { corrupted: false, poeWatch: entry(10) },
        { corrupted: true, poeWatch: entry(11) },
      ],
    },
    { subcategory: "foulborn", listings: [{ corrupted: false, poeWatch: entry(20) }] },
  ],
};
const uniqueBasesByName = new Map([["Ruby Ring", ring]]);
const find = (extra: Record<string, unknown>) =>
  findUniqueEntries({ Rarity: "Unique", ...extra } as FilterItem, uniqueBasesByName);

describe("findUniqueEntries", () => {
  it("finds, for a plain unique, every uncorrupted regular listing on its base", () => {
    expect(find({ BaseType: "Ruby Ring" })).toEqual([entry(10)]);
  });

  it("finds only the corrupted listings for a corrupted unique", () => {
    expect(find({ BaseType: "Ruby Ring", Corrupted: true })).toEqual([entry(11)]);
  });

  it("finds only the foulborn group for a foulborn unique", () => {
    expect(find({ BaseType: "Ruby Ring", Foulborn: true })).toEqual([entry(20)]);
  });

  it("finds nothing for a unique on an unknown base", () => {
    expect(find({ BaseType: "Iron Ring" })).toEqual([]);
  });

  it("finds nothing for a unique with a list of base types", () => {
    expect(find({ BaseType: ["Ruby Ring"] })).toEqual([]);
  });
});
