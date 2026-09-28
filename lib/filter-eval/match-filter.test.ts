import { describe, it, expect } from "@jest/globals";
import { buildFilterMatcher, buildEveryMatchMatcher } from "./match-filter.ts";
import { evaluateFilter } from "./evaluate-filter.ts";
import { parseFilter } from "./parse-filter.ts";
import type { FilterBlock, FilterItem } from "./filter-ast.ts";

const NOTE = "#@ tier=T1 verb=take";
const filterOf = (...blocks: string[][]): FilterBlock[] =>
  parseFilter(blocks.map((lines) => [...lines, NOTE].join("\n")).join("\n"));
const lines = (blocks: readonly FilterBlock[]): number[] => blocks.map((b) => b.line);

describe("buildFilterMatcher", () => {
  it("names the first matching block without Continue as the winner and stops there", () => {
    const match = buildFilterMatcher(filterOf(["Show", "Quality > 5"], ["Hide"]));

    const result = match({ Quality: 10 });

    expect(result.winner?.line).toBe(1);
    expect(lines(result.matched)).toEqual([1]); // Hide never reached
  });

  it("lists a Continue block that matched ahead of the winner", () => {
    const match = buildFilterMatcher(filterOf(["Show", "Continue"], ["Hide"]));

    const result = match({});

    expect(result.winner?.line).toBe(4);
    expect(lines(result.matched)).toEqual([1, 4]);
  });

  it("names no winner at all when only Continue blocks match", () => {
    const match = buildFilterMatcher(filterOf(["Show", "Continue"]));

    const result = match({});

    expect(result).toStrictEqual({ matched: [expect.objectContaining({ line: 1 })] }); // key absent, not undefined
  });

  it("walks base-type blocks and blocks that name no base type together, in file order", () => {
    const filter = filterOf(
      ["Show", "Quality > 5"],
      ["Show", "BaseType == \"Coral Ring\"", "Continue"],
      ["Show", "Continue"],
      ["Hide"],
    );

    const result = buildFilterMatcher(filter)({ BaseType: "coral ring", Quality: 0 });

    expect(lines(result.matched)).toEqual([4, 8, 11]); // indexed list merged by position
  });

  it("skips every base-type block for an item that has no base type", () => {
    const match = buildFilterMatcher(filterOf(["Show", "BaseType == Ring Amulet", "Continue"], ["Hide"]));

    const result = match({});

    expect(lines(result.matched)).toEqual([5]);
  });

  it("indexes a block by its first exact base-type line only, so a second one still has to pass", () => {
    const match = buildFilterMatcher(filterOf(["Show", "BaseType == Ring", "BaseType == Amulet"], ["Hide"]));

    const result = match({ BaseType: "Amulet" });

    expect(result.winner?.line).toBe(5); // never a candidate for Amulet
  });

  it("matches a block once even when its exact base-type line names the same base twice", () => {
    const match = buildFilterMatcher(filterOf(["Show", "BaseType == Ring Ring", "Continue"], ["Hide"]));

    const result = match({ BaseType: "Ring" });

    expect(lines(result.matched)).toEqual([1, 5]); // keys deduplicated with a Set
  });

  it("still matches part of a name on a plain base-type line, which is not indexed", () => {
    const match = buildFilterMatcher(filterOf(["Show", "BaseType Ring"]));

    const result = match({ BaseType: "Coral Ring" });

    expect(result.winner?.line).toBe(1); // "=" is substring, so generic
  });

  it("gives the same answer when asked about the same base type twice", () => {
    const match = buildFilterMatcher(filterOf(["Show", "BaseType == Ring"], ["Hide"]));

    const first = match({ BaseType: "Ring" });
    const second = match({ BaseType: "Ring" });

    expect([first.winner?.line, second.winner?.line]).toEqual([1, 1]); // second read comes from the candidate cache
  });

  describe("picks the same winner as walking the filter one block at a time", () => {
    const cases: [string, FilterItem][] = [
      ["Corrupted != True", { Corrupted: false }],
      ["Corrupted != True", {}],
      ["ItemLevel >= 84", { ItemLevel: 84 }],
      ["Rarity >= Rare", { Rarity: "unique" }],
      ["Rarity Normal Magic", { Rarity: "MAGIC" }],
      ["Rarity ! Unique", { Rarity: "Rare" }],
      ["Class \"ring\"", { Class: "Rings" }],
      ["Class != Ring", { Class: "Belts" }],
      ["BaseType == \"Coral Ring\"", { BaseType: "coral ring" }],
      ["HasInfluence None", { HasInfluence: [] }],
      ["HasInfluence != Elder", { HasInfluence: ["Shaper"] }],
      ["SocketGroup >= 3GG", { SocketGroup: "RGG B" }],
      ["Sockets < 3", { Sockets: "" }],
      ["HasExplicitMod >=2 \"of Haast\" Tyrannical", { HasExplicitMod: ["Tyrannical", "of Haast"] }],
      ["TransfiguredGem True", { TransfiguredGem: "" }],
      ["TransfiguredGem == wintry", { TransfiguredGem: "Wintry" }],
      ["TransfiguredGem != Wintry", { TransfiguredGem: "Other" }],
    ];

    it.each(cases)("for the line %s", (line, item) => {
      const filter = filterOf(["Show", line], ["Hide"]);
      const expected = evaluateFilter(filter, item).matched[0]?.line;

      const result = buildFilterMatcher(filter)(item);

      expect(result.winner?.line).toBe(expected); // precompiled tests vs the reference matcher
    });
  });
});

describe("buildEveryMatchMatcher", () => {
  it("keeps listing matching blocks after the winner", () => {
    const match = buildEveryMatchMatcher(filterOf(["Show"], ["Show", "Continue"], ["Hide"]));

    const result = match({});

    expect(result.winner?.line).toBe(1);
    expect(lines(result.matched)).toEqual([1, 3, 6]); // walk does not stop
  });

  it("keeps the first block that stopped as the winner when a later one would stop too", () => {
    const match = buildEveryMatchMatcher(filterOf(["Show", "Continue"], ["Hide"], ["Show"]));

    const result = match({});

    expect(result.winner?.line).toBe(4); // later stoppers do not replace it
  });
});
