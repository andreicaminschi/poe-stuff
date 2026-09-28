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
  it("answers with the row's own entry when the winning block names only the row", () => {
    const found = findBlockEntries(rare, winning("Ring"), rowsByKey);

    expect(found).toEqual([entry(1)]);
  });

  it("answers with the variant's entry when the note names a variant with a space in it", () => {
    const found = findBlockEntries(rare, winning("Ring ilvl 84"), rowsByKey);

    expect(found).toEqual([entry(2)]);
  }); // "ilvl 84" must survive the key/variant split intact

  it("answers with nothing when the named variant carries no price", () => {
    const found = findBlockEntries(rare, winning("Ring bare"), rowsByKey);

    expect(found).toEqual([]);
  }); // must not fall back to the row's own entry

  it("answers with nothing when the note names a variant the row does not have", () => {
    const found = findBlockEntries(rare, winning("Ring ilvl 86"), rowsByKey);

    expect(found).toEqual([]);
  });

  it("answers with nothing when no block takes the item", () => {
    const found = findBlockEntries(rare, winning(undefined), rowsByKey);

    expect(found).toEqual([]);
  });

  it("answers with nothing when the winning block names a row it does not know", () => {
    const found = findBlockEntries(rare, winning("Amulet"), rowsByKey);

    expect(found).toEqual([]);
  });
});
