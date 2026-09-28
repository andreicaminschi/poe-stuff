import { describe, expect, it } from "@jest/globals";
import type { FilterItem } from "@poe/filter-eval/filter-ast";
import { findUniqueLinks } from "./find-unique-links.ts";
import type { LinkRow, PoeWatchLink } from "./types.ts";

const link = (id: number, name = "x"): PoeWatchLink => ({ source: "poeWatch:items", id, name });

const ring: LinkRow = {
  key: "Ring",
  name: "Ruby Ring",
  uniques: [
    {
      subcategory: null,
      listings: [
        { corrupted: false, poeWatch: link(10) },
        { corrupted: true, poeWatch: link(11) },
      ],
    },
    { subcategory: "foulborn", listings: [{ corrupted: false, poeWatch: link(20) }] },
  ],
};
const uniqueBasesByName = new Map([["Ruby Ring", ring]]);
const find = (extra: Record<string, unknown>) =>
  findUniqueLinks({ Rarity: "Unique", ...extra } as FilterItem, uniqueBasesByName);

describe("findUniqueLinks", () => {
  it("links a plain unique to every uncorrupted regular listing on its base", () => {
    expect(find({ BaseType: "Ruby Ring" })).toEqual([link(10)]);
  });

  it("links a corrupted unique to the corrupted listings only", () => {
    expect(find({ BaseType: "Ruby Ring", Corrupted: true })).toEqual([link(11)]);
  });

  it("links a foulborn unique to the foulborn group only", () => {
    expect(find({ BaseType: "Ruby Ring", Foulborn: true })).toEqual([link(20)]);
  });

  it("links a unique on an unknown base to nothing", () => {
    expect(find({ BaseType: "Iron Ring" })).toEqual([]);
  });

  it("links a unique with a list of base types to nothing", () => {
    expect(find({ BaseType: ["Ruby Ring"] })).toEqual([]);
  });
});
