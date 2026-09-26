import { describe, expect, it } from "@jest/globals";
import type { FilterItem } from "@poe/filter-eval/filter-ast";
import type { FilterMatcher } from "@poe/filter-eval/match-filter";
import { matchesOf, type LinkRow, type PoeWatchLink } from "./matches-of.ts";

const link = (id: number, name = "x"): PoeWatchLink => ({ source: "poeWatch:items", id, name });
const winning = (freehand: string | undefined): FilterMatcher =>
  (() => ({ winner: freehand === undefined ? undefined : { freehand } })) as unknown as FilterMatcher;

const ring: LinkRow = {
  key: "Ring",
  name: "Ruby Ring",
  poeWatch: link(1),
  variants: [{ name: "ilvl 84", poeWatch: link(2) }, { name: "bare" }],
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
const rows = new Map([["Ring", ring]]);
const bases = new Map([["Ruby Ring", ring]]);
const item = (extra: Record<string, unknown>) => extra as FilterItem;

describe("matchesOf", () => {
  it("links a non-unique item to the row of the block that takes it", () => {
    expect(matchesOf(item({ Rarity: "Rare" }), winning("Ring"), rows, bases)).toEqual([link(1)]);
  });

  it("links to a variant when the block note names one, including a name with spaces", () => {
    expect(matchesOf(item({ Rarity: "Rare" }), winning("Ring ilvl 84"), rows, bases)).toEqual([link(2)]);
  });

  it("links nothing when the variant has no PoeWatch entry", () => {
    expect(matchesOf(item({ Rarity: "Rare" }), winning("Ring bare"), rows, bases)).toEqual([]);
  });

  it("links nothing when no block takes the item", () => {
    expect(matchesOf(item({ Rarity: "Rare" }), winning(undefined), rows, bases)).toEqual([]);
  });

  it("links nothing when the block names a row it does not know", () => {
    expect(matchesOf(item({ Rarity: "Rare" }), winning("Amulet"), rows, bases)).toEqual([]);
  });

  it("links a plain unique to every uncorrupted regular listing on its base, ignoring the filter", () => {
    expect(matchesOf(item({ Rarity: "Unique", BaseType: "Ruby Ring" }), winning("Ring"), rows, bases)).toEqual([link(10)]);
  });

  it("links a corrupted unique to the corrupted listings only", () => {
    expect(
      matchesOf(item({ Rarity: "Unique", BaseType: "Ruby Ring", Corrupted: true }), winning(undefined), rows, bases),
    ).toEqual([link(11)]);
  });

  it("links a foulborn unique to the foulborn group only", () => {
    expect(
      matchesOf(item({ Rarity: "Unique", BaseType: "Ruby Ring", Foulborn: true }), winning(undefined), rows, bases),
    ).toEqual([link(20)]);
  });

  it("links a unique on an unknown base, or with a list of base types, to nothing", () => {
    expect(matchesOf(item({ Rarity: "Unique", BaseType: ["Ruby Ring"] }), winning("Ring"), rows, bases)).toEqual([]);
  });
});
