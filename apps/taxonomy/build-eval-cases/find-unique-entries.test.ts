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
        { corrupted: false, poeWatch: entry(12) },
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
  it("answers a plain unique ring with every uncorrupted regular listing on its base", () => {
    const found = find({ BaseType: "Ruby Ring" });

    expect(found).toEqual([entry(10), entry(12)]);
  }); // the base alone cannot tell two uniques apart, so both count

  it("answers a corrupted unique with only the corrupted listings", () => {
    const found = find({ BaseType: "Ruby Ring", Corrupted: true });

    expect(found).toEqual([entry(11)]);
  });

  it("answers a foulborn unique with only the foulborn group", () => {
    const found = find({ BaseType: "Ruby Ring", Foulborn: true });

    expect(found).toEqual([entry(20)]);
  });

  it("answers a corrupted foulborn unique with nothing when no such listing exists", () => {
    const found = find({ BaseType: "Ruby Ring", Foulborn: true, Corrupted: true });

    expect(found).toEqual([]);
  }); // both filters apply together

  it("answers a unique on an unknown base with nothing", () => {
    const found = find({ BaseType: "Iron Ring" });

    expect(found).toEqual([]);
  });

  it("answers a unique whose base type is a list with nothing", () => {
    const found = find({ BaseType: ["Ruby Ring"] });

    expect(found).toEqual([]);
  }); // only a single string names a base
});
