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
  it("returns the first matching block without Continue as the winner", () => {
    const filter = filterOf(["Show", "Quality > 5"], ["Hide"]);

    const result = buildFilterMatcher(filter)({ Quality: 10 });

    expect(result.winner?.line).toBe(1);
    expect(lines(result.matched)).toEqual([1]);
  });

  it("keeps Continue blocks in the matched list before the winner", () => {
    const filter = filterOf(["Show", "Continue"], ["Hide"]);

    const result = buildFilterMatcher(filter)({});

    expect(result.winner?.line).toBe(4);
    expect(lines(result.matched)).toEqual([1, 4]);
  });

  it("leaves out the winner when only Continue blocks match", () => {
    const result = buildFilterMatcher(filterOf(["Show", "Continue"]))({});

    expect(result).toEqual({ matched: [expect.objectContaining({ line: 1 })] });
    expect("winner" in result).toBe(false);
  });

  it("walks base-type blocks and generic blocks in file order", () => {
    const filter = filterOf(
      ["Show", "Quality > 5"],
      ["Show", "BaseType == \"Coral Ring\"", "Continue"],
      ["Show", "Continue"],
      ["Hide"],
    );

    const result = buildFilterMatcher(filter)({ BaseType: "coral ring", Quality: 0 });

    expect(lines(result.matched)).toEqual([4, 8, 11]);
  });

  it("skips base-type blocks for an item with no base type", () => {
    const filter = filterOf(["Show", "BaseType == Ring Amulet", "Continue"], ["Hide"]);

    expect(lines(buildFilterMatcher(filter)({}).matched)).toEqual([5]);
  });

  it("only indexes the first exact base-type line of a block", () => {
    const filter = filterOf(["Show", "BaseType == Ring", "BaseType == Amulet"], ["Hide"]);

    expect(buildFilterMatcher(filter)({ BaseType: "Amulet" }).winner?.line).toBe(5);
  });

  it("still substring-matches a plain base-type line in a generic block", () => {
    const filter = filterOf(["Show", "BaseType Ring"]);

    expect(buildFilterMatcher(filter)({ BaseType: "Coral Ring" }).winner?.line).toBe(1);
  });

  it("answers the same for the same item called twice", () => {
    const match = buildFilterMatcher(filterOf(["Show", "BaseType == Ring"], ["Hide"]));

    expect([match({ BaseType: "Ring" }).winner?.line, match({ BaseType: "Ring" }).winner?.line]).toEqual([1, 1]);
  });

  describe("agrees with evaluateFilter on which block wins", () => {
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

      expect(buildFilterMatcher(filter)(item).winner?.line).toBe(expected);
    });
  });
});

describe("buildEveryMatchMatcher", () => {
  it("keeps matching blocks after the winner", () => {
    const filter = filterOf(["Show"], ["Show", "Continue"], ["Hide"]);

    const result = buildEveryMatchMatcher(filter)({});

    expect(result.winner?.line).toBe(1);
    expect(lines(result.matched)).toEqual([1, 3, 6]);
  });

  it("keeps the first winner when later blocks also stop", () => {
    const result = buildEveryMatchMatcher(filterOf(["Show", "Continue"], ["Hide"], ["Show"]))({});

    expect(result.winner?.line).toBe(4);
  });
});
