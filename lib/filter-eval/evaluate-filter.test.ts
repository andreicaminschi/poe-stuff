import { describe, it, expect } from "@jest/globals";
import { evaluateFilter, matchCondition } from "./evaluate-filter.ts";
import { parseFilter } from "./parse-filter.ts";
import type { FilterItem } from "./filter-ast.ts";

const cond = (line: string) => parseFilter(`Show\n${line}\n#@ tier=T1 verb=take`)[0]!.conditions[0]!;
const hits = (line: string, item: FilterItem): boolean => matchCondition(cond(line), item);

describe("matchCondition", () => {
  describe("missing values", () => {
    it("fails a condition when the item lacks the value, even when negated", () => {
      expect(hits("Corrupted != True", {})).toBe(false);
    });
  });

  describe("booleans", () => {
    it("matches when the item's flag equals the wanted one", () => {
      expect(hits("Corrupted False", { Corrupted: false })).toBe(true);
    });

    it("flips under a negating operator", () => {
      expect(hits("Corrupted ! True", { Corrupted: false })).toBe(true);
    });
  });

  describe("numbers", () => {
    it("matches exactly at a greater-or-equal edge and not one below", () => {
      expect([hits("ItemLevel >= 84", { ItemLevel: 84 }), hits("ItemLevel >= 84", { ItemLevel: 83 })]).toEqual([
        true,
        false,
      ]);
    });

    it("excludes the edge under strictly-greater", () => {
      expect(hits("ItemLevel > 84", { ItemLevel: 84 })).toBe(false);
    });

    it("refuses a hex value in the filter", () => {
      expect(() => hits("Quality 0x10", { Quality: 16 })).toThrow("takes a number");
    });
  });

  describe("rarity", () => {
    it("walks the ladder under a comparison", () => {
      expect([hits("Rarity >= Rare", { Rarity: "Unique" }), hits("Rarity >= Rare", { Rarity: "Magic" })]).toEqual([
        true,
        false,
      ]);
    });

    it("never matches a rarity the ladder does not know under a comparison", () => {
      expect(hits("Rarity < Unique", { Rarity: "Relic" } as FilterItem)).toBe(false);
    });

    it("treats several rarities as any-of, ignoring case", () => {
      expect(hits("Rarity Normal Magic", { Rarity: "magic" })).toBe(true);
    });

    it("matches every other rarity under a negated list", () => {
      expect([hits("Rarity != Unique", { Rarity: "Rare" }), hits("Rarity != Unique", { Rarity: "Unique" })]).toEqual([
        true,
        false,
      ]);
    });
  });

  describe("strings", () => {
    it("matches part of the name under plain equality", () => {
      expect(hits("BaseType \"Stone Ring\"", { BaseType: "Two-Stone Ring" })).toBe(true);
    });

    it("needs the whole name under double equals, ignoring case", () => {
      expect([
        hits("BaseType == \"stone ring\"", { BaseType: "Two-Stone Ring" }),
        hits("BaseType == \"two-stone ring\"", { BaseType: "Two-Stone Ring" }),
      ]).toEqual([false, true]);
    });

    it("matches every name under an empty quoted value", () => {
      expect(hits("BaseType \"\"", { BaseType: "Anything" })).toBe(true);
    });

    it("matches when none of the names is part of the item's under negation", () => {
      expect([
        hits("Class != Ring Amulet", { Class: "Belts" }),
        hits("Class != Ring Amulet", { Class: "Rings" }),
      ]).toEqual([true, false]);
    });
  });

  describe("enums", () => {
    it("matches when the item holds any wanted value", () => {
      expect(hits("HasInfluence Elder Shaper", { HasInfluence: ["Crusader", "shaper"] })).toBe(true);
    });

    it("matches None only for an item with no influence", () => {
      expect([
        hits("HasInfluence None", { HasInfluence: [] }),
        hits("HasInfluence None", { HasInfluence: ["None"] }),
      ]).toEqual([true, false]);
    });

    it("flips under negation", () => {
      expect(hits("HasInfluence != None", { HasInfluence: ["Elder"] })).toBe(true);
    });
  });

  describe("sockets", () => {
    it("lets Sockets count across linked groups", () => {
      expect(hits("Sockets >= 5GG", { Sockets: "RGB GG" })).toBe(true);
    });

    it("makes SocketGroup find one group that satisfies the spec alone", () => {
      expect([
        hits("SocketGroup >= 3GG", { SocketGroup: "RGB GG" }),
        hits("SocketGroup >= 3GG", { SocketGroup: "RGG B" }),
      ]).toEqual([false, true]);
    });

    it("treats colours as at least, ignoring extra sockets", () => {
      expect(hits("SocketGroup RGB", { SocketGroup: "RRGGBB" })).toBe(true);
    });

    it("applies the operator to the count only", () => {
      expect([hits("Sockets < 3", { Sockets: "RG" }), hits("Sockets < 3", { Sockets: "RGB" })]).toEqual([true, false]);
    });

    it("never matches SocketGroup on an item with no sockets, even when asking for fewer than three", () => {
      // groups list is empty
      expect([hits("SocketGroup < 3", { SocketGroup: "" }), hits("Sockets < 3", { Sockets: "" })]).toEqual([
        false,
        true,
      ]);
    });
  });

  describe("counted mods", () => {
    it("counts item mods that contain any listed name", () => {
      expect([
        hits("HasExplicitMod >=2 \"of Haast\" Tyrannical", { HasExplicitMod: ["Tyrannical", "of Haast"] }),
        hits("HasExplicitMod >=2 \"of Haast\" Tyrannical", { HasExplicitMod: ["Tyrannical"] }),
      ]).toEqual([true, false]);
    });

    it("counts one mod once even when it contains two listed names", () => {
      expect(hits("HasExplicitMod >=2 of Haast", { HasExplicitMod: ["of Haast"] })).toBe(false);
    });

    it("matches a negated line only when no mod is listed", () => {
      expect([
        hits("HasExplicitMod != \"x\"", { HasExplicitMod: [] }),
        hits("HasExplicitMod != \"x\"", { HasExplicitMod: ["x"] }),
      ]).toEqual([true, false]);
    });
  });

  describe("transfigured gem", () => {
    it("treats True as any transfigured gem and an empty name as none", () => {
      expect([
        hits("TransfiguredGem True", { TransfiguredGem: "Frostblink of Wintry Blast" }),
        hits("TransfiguredGem True", { TransfiguredGem: "" }),
      ]).toEqual([true, false]);
    });

    it("matches False only on a gem that is not transfigured", () => {
      expect(hits("TransfiguredGem False", { TransfiguredGem: "" })).toBe(true);
    });

    it("matches part of a gem name under plain equality and the whole under double equals", () => {
      const item = { TransfiguredGem: "Frostblink of Wintry Blast" };

      expect([hits("TransfiguredGem Wintry", item), hits("TransfiguredGem == Wintry", item)]).toEqual([true, false]);
    });

    it("flips a name match under negation", () => {
      expect(hits("TransfiguredGem != Wintry", { TransfiguredGem: "Other" })).toBe(true);
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

  it("stops at the first matching block without Continue", () => {
    const result = evaluateFilter(filter, { ItemLevel: 50, Quality: 20 });

    expect(result).toEqual({
      verdict: "Show",
      notes: { tier: "T1", verb: "take" },
      contributions: [
        { key: "tier", value: "T1", line: 5 },
        { key: "verb", value: "take", line: 5 },
      ],
      matched: [{ line: 5, keyword: "Show", freehand: "first" }],
    });
  });

  it("carries notes past a Continue block and lets later blocks overwrite them", () => {
    const result = evaluateFilter(filter, { ItemLevel: 85, Quality: 0 });

    expect(result.verdict).toBe("Hide");
    expect(result.notes).toEqual({ tier: "hidden", verb: "take", family: "bases" });
    expect(result.contributions.map((c) => c.line)).toEqual([1, 1, 1, 8, 8]);
    expect(result.matched.map((m) => m.line)).toEqual([1, 8]);
  });

  it("reports no verdict when nothing matches", () => {
    expect(evaluateFilter([], {})).toEqual({ verdict: "none", notes: {}, contributions: [], matched: [] });
  });

  it("reports no verdict when the last matching block continues", () => {
    const result = evaluateFilter(filter.slice(0, 1), { ItemLevel: 85 });

    expect(result.verdict).toBe("none");
    expect(result.notes.tier).toBe("T3");
  });

  it("refuses two duplicate note keys in one block", () => {
    expect(() => parseFilter("Show\n#@ tier=T1 verb=take tier=T2")).toThrow("note key \"tier\" appears twice");
  });
});
