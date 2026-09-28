import { describe, expect, it } from "@jest/globals";
import type { FilterItem } from "@poe/filter-eval/filter-ast";
import type { FilterMatcher } from "@poe/filter-eval/match-filter";
import { findBlockLinks } from "./find-block-links.ts";
import type { LinkRow, PoeWatchLink } from "./types.ts";

const link = (id: number, name = "x"): PoeWatchLink => ({ source: "poeWatch:items", id, name });
const winning = (freehand: string | undefined): FilterMatcher =>
  (() => ({ winner: freehand === undefined
    ? undefined
    : { freehand } })) as unknown as FilterMatcher;

const ring: LinkRow = {
  key: "Ring",
  name: "Ruby Ring",
  poeWatch: link(1),
  variants: [{ name: "ilvl 84", poeWatch: link(2) }, { name: "bare" }],
};
const rowsByKey = new Map([["Ring", ring]]);
const rare = { Rarity: "Rare" } as FilterItem;

describe("findBlockLinks", () => {
  it("links an item to the row of the block that takes it", () => {
    expect(findBlockLinks(rare, winning("Ring"), rowsByKey)).toEqual([link(1)]);
  });

  it("links to a variant when the block note names one, including a name with spaces", () => {
    expect(findBlockLinks(rare, winning("Ring ilvl 84"), rowsByKey)).toEqual([link(2)]);
  });

  it("links nothing when the variant has no PoeWatch entry", () => {
    expect(findBlockLinks(rare, winning("Ring bare"), rowsByKey)).toEqual([]);
  });

  it("links nothing when no block takes the item", () => {
    expect(findBlockLinks(rare, winning(undefined), rowsByKey)).toEqual([]);
  });

  it("links nothing when the block names a row it does not know", () => {
    expect(findBlockLinks(rare, winning("Amulet"), rowsByKey)).toEqual([]);
  });
});
