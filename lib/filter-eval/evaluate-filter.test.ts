import { describe, it, expect } from "@jest/globals";
import { evaluateFilter, matchCondition } from "./evaluate-filter.ts";
import { parseFilter } from "./parse-filter.ts";
import type { FilterItem } from "./filter-ast.ts";

const cond = (line: string) => parseFilter(`Show\n${line}\n#@ tier=T1 verb=take`)[0]!.conditions[0]!;
const hits = (line: string, item: FilterItem): boolean => matchCondition(cond(line), item);

describe("matchCondition", () => {
  describe("missing values", () => {
    it("fails a condition on an item that lacks the value, even when the condition is negated", () => {
      const result = hits("Corrupted != True", {});

      expect(result).toBe(false); // a gap is never flipped to true
    });
  });

  describe("yes-or-no conditions", () => {
    it("matches an uncorrupted item against Corrupted False", () => {
      const result = hits("Corrupted False", { Corrupted: false });

      expect(result).toBe(true);
    });

    it("matches an uncorrupted item against Corrupted not True", () => {
      const result = hits("Corrupted ! True", { Corrupted: false });

      expect(result).toBe(true); // "!" negates like "!="
    });
  });

  describe("numbers", () => {
    it("matches item level 84 against at least 84 and not item level 83", () => {
      const result = [hits("ItemLevel >= 84", { ItemLevel: 84 }), hits("ItemLevel >= 84", { ItemLevel: 83 })];

      expect(result).toEqual([true, false]); // edge and edge minus one
    });

    it("does not match item level 84 against more than 84", () => {
      const result = hits("ItemLevel > 84", { ItemLevel: 84 });

      expect(result).toBe(false); // strict excludes the edge
    });
  });

  describe("rarity", () => {
    it("matches a unique and not a magic item against at least Rare", () => {
      const result = [hits("Rarity >= Rare", { Rarity: "Unique" }), hits("Rarity >= Rare", { Rarity: "Magic" })];

      expect(result).toEqual([true, false]); // walks Normal < Magic < Rare < Unique
    });

    it("never matches a rarity the game does not have under a comparison", () => {
      const result = hits("Rarity < Unique", { Rarity: "Relic" } as FilterItem);

      expect(result).toBe(false); // index -1 is not below anything
    });

    it("matches any one of several listed rarities, ignoring case", () => {
      const result = hits("Rarity Normal Magic", { Rarity: "magic" });

      expect(result).toBe(true); // list, not ladder
    });

    it("matches every rarity except Unique against not Unique", () => {
      const result = [hits("Rarity != Unique", { Rarity: "Rare" }), hits("Rarity != Unique", { Rarity: "Unique" })];

      expect(result).toEqual([true, false]);
    });
  });

  describe("names", () => {
    it("matches part of a name under a single equals", () => {
      const result = hits("BaseType \"Stone Ring\"", { BaseType: "Two-Stone Ring" });

      expect(result).toBe(true); // substring, as the game does
    });

    it("needs the whole name, in any case, under double equals", () => {
      const item = { BaseType: "Two-Stone Ring" };

      const result = [hits("BaseType == \"stone ring\"", item), hits("BaseType == \"two-stone ring\"", item)];

      expect(result).toEqual([false, true]);
    });

    it("matches every name against an empty quoted name", () => {
      const result = hits("BaseType \"\"", { BaseType: "Anything" });

      expect(result).toBe(true); // "" is inside every string
    });

    it("matches a belt and not a ring against not Ring or Amulet", () => {
      const result = [hits("Class != Ring Amulet", { Class: "Belts" }), hits("Class != Ring Amulet", { Class: "Rings" })];

      expect(result).toEqual([true, false]); // negated substring
    });
  });

  describe("influences", () => {
    it("matches an item holding any one of the wanted influences, ignoring case", () => {
      const result = hits("HasInfluence Elder Shaper", { HasInfluence: ["Crusader", "shaper"] });

      expect(result).toBe(true);
    });

    it("matches None only on an item with no influence at all, not one holding the word", () => {
      const result = [hits("HasInfluence None", { HasInfluence: [] }), hits("HasInfluence None", { HasInfluence: ["None"] })];

      expect(result).toEqual([true, false]); // None means the empty list
    });

    it("matches an Elder item against not None", () => {
      const result = hits("HasInfluence != None", { HasInfluence: ["Elder"] });

      expect(result).toBe(true);
    });
  });

  describe("sockets", () => {
    it("counts sockets across linked groups for Sockets", () => {
      const result = hits("Sockets >= 5GG", { Sockets: "RGB GG" });

      expect(result).toBe(true); // links ignored
    });

    it("needs one linked group to satisfy the whole spec on its own for SocketGroup", () => {
      const result = [hits("SocketGroup >= 3GG", { SocketGroup: "RGB GG" }), hits("SocketGroup >= 3GG", { SocketGroup: "RGG B" })];

      expect(result).toEqual([false, true]); // per group, first that answers
    });

    it("treats colours as a minimum and ignores extra sockets", () => {
      const result = hits("SocketGroup RGB", { SocketGroup: "RRGGBB" });

      expect(result).toBe(true); // colours are always "at least"
    });

    it("applies fewer than three to the socket count: two sockets match, three do not", () => {
      const result = [hits("Sockets < 3", { Sockets: "RG" }), hits("Sockets < 3", { Sockets: "RGB" })];

      expect(result).toEqual([true, false]);
    });

    it("never matches SocketGroup on an item with no sockets, while Sockets fewer than three does", () => {
      const result = [hits("SocketGroup < 3", { SocketGroup: "" }), hits("Sockets < 3", { Sockets: "" })];

      expect(result).toEqual([false, true]); // no groups to ask, vs one empty run
    });
  });

  describe("counted mods", () => {
    it("matches at least two only when two of the item's mods contain a listed name", () => {
      const line = "HasExplicitMod >=2 \"of Haast\" Tyrannical";

      const result = [hits(line, { HasExplicitMod: ["Tyrannical", "of Haast"] }), hits(line, { HasExplicitMod: ["Tyrannical"] })];

      expect(result).toEqual([true, false]);
    });

    it("counts one mod once even when it contains two of the listed names", () => {
      const result = hits("HasExplicitMod >=2 of Haast", { HasExplicitMod: ["of Haast"] });

      expect(result).toBe(false); // counts mods, not names
    });

    it("matches a negated line only on an item with none of the listed mods", () => {
      const result = [hits("HasExplicitMod != \"x\"", { HasExplicitMod: [] }), hits("HasExplicitMod != \"x\"", { HasExplicitMod: ["x"] })];

      expect(result).toEqual([true, false]); // count defaults to 1, compared with !=
    });
  });

  describe("transfigured gems", () => {
    it("matches any transfigured gem against True and not a gem with an empty name", () => {
      const result = [
        hits("TransfiguredGem True", { TransfiguredGem: "Frostblink of Wintry Blast" }),
        hits("TransfiguredGem True", { TransfiguredGem: "" }),
      ];

      expect(result).toEqual([true, false]); // empty string means not transfigured
    });

    it("matches a gem that is not transfigured against False", () => {
      const result = hits("TransfiguredGem False", { TransfiguredGem: "" });

      expect(result).toBe(true);
    });

    it("matches part of a gem name under a single equals and needs the whole name under double equals", () => {
      const item = { TransfiguredGem: "Frostblink of Wintry Blast" };

      const result = [hits("TransfiguredGem Wintry", item), hits("TransfiguredGem == Wintry", item)];

      expect(result).toEqual([true, false]);
    });

    it("matches a gem whose name does not contain the word under not", () => {
      const result = hits("TransfiguredGem != Wintry", { TransfiguredGem: "Other" });

      expect(result).toBe(true);
    });
  });
});

describe("evaluateFilter", () => {
  const filter = parseFilter(
    [
      "Show",
      "ItemLevel >= 80",
      "Continue",
      "#@ tier=T3 verb=check family=bases",
      "Show",
      "Quality > 10",
      "#@ tier=T1 verb=take first",
      "Hide",
      "#@ tier=hidden verb=take",
    ].join("\n"),
  );

  it("stops at the first matching block that does not continue and reports its notes by header line", () => {
    const result = evaluateFilter(filter, { ItemLevel: 50, Quality: 20 });

    expect(result).toEqual({
      verdict: "Show",
      notes: { tier: "T1", verb: "take" },
      contributions: [
        { key: "tier", value: "T1", line: 5 },
        { key: "verb", value: "take", line: 5 },
      ],
      matched: [{ line: 5, keyword: "Show", freehand: "first" }],
    }); // line is the block header, not the note
  });

  it("carries notes past a Continue block and lets a later block overwrite the same keys", () => {
    const result = evaluateFilter(filter, { ItemLevel: 85, Quality: 0 });

    expect(result.verdict).toBe("Hide");
    expect(result.notes).toEqual({ tier: "hidden", verb: "take", family: "bases" }); // family survives from the first block
    expect(result.contributions.map((c) => c.line)).toEqual([1, 1, 1, 8, 8]);
    expect(result.matched.map((m) => m.line)).toEqual([1, 8]);
  });

  it("gives no verdict for an empty filter", () => {
    const result = evaluateFilter([], {});

    expect(result).toEqual({ verdict: "none", notes: {}, contributions: [], matched: [] });
  });

  it("gives no verdict but keeps the notes when the last block that matched says Continue", () => {
    const result = evaluateFilter(filter.slice(0, 1), { ItemLevel: 85 });

    expect(result.verdict).toBe("none");
    expect(result.notes.tier).toBe("T3"); // walk ran off the end
  });
});
