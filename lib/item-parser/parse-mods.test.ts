import { describe, it, expect } from "@jest/globals";
import { isModHeader, parseModHeader, parseModLine, parseModSection, suffixMod } from "./parse-mods.ts";

describe("isModHeader", () => {
  it("accepts a line wrapped in braces", () => {
    expect(isModHeader("{ Implicit Modifier }")).toBe(true);
  });

  it("refuses a line with text after the closing brace", () => {
    expect(isModHeader("{ Implicit Modifier } x")).toBe(false); // anchored at both ends
  });
});

describe("parseModHeader", () => {
  it("reads a crafted prefix's position, quoted name, tag and the words that are not a position", () => {
    const header = parseModHeader("{ Master Crafted Prefix Modifier \"Upgraded\" — Gem }");

    expect(header).toEqual({
      raw: "Master Crafted Prefix Modifier \"Upgraded\" — Gem",
      affix: "prefix",
      name: "Upgraded",
      tier: undefined,
      tags: ["Gem"],
      qualifiers: ["Master", "Crafted"],
      extra: [],
    }); // "Modifier" dropped from the words
  });

  it("reads the tier and all three comma-separated tags", () => {
    const header = parseModHeader("{ Suffix Modifier \"of the Magma\" (Tier: 2) — Elemental, Fire, Resistance }");

    expect([header.affix, header.name, header.tier, header.tags]).toEqual(["suffix", "of the Magma", 2, ["Elemental", "Fire", "Resistance"]]);
  });

  it("files a header with no position word as other and keeps its words as qualifiers", () => {
    const header = parseModHeader("{ Unique Modifier }");

    expect([header.affix, header.qualifiers, header.tags]).toEqual(["other", ["Unique"], []]); // unknown words survive for the matcher
  });

  it("keeps every clause after the first as extra", () => {
    const header = parseModHeader("{ Unique Modifier — Life — 20% Increased — More }");

    expect(header.extra).toEqual(["20% Increased", "More"]); // first clause is tags
  });

  it("files a header naming both suffix and prefix as other", () => {
    const header = parseModHeader("{ Suffix Prefix Modifier }");

    expect(header.affix).toBe("other"); // ambiguous is not guessed
  });

  it("keeps the whole line as the raw text when it has no braces", () => {
    const header = parseModHeader("Implicit Modifier");

    expect(header.raw).toBe("Implicit Modifier");
  });
});

describe("parseModLine", () => {
  it("reads the roll and takes the unscalable note off the text", () => {
    const line = parseModLine("+1(1-3)% to Chaos — Unscalable Value");

    expect(line).toEqual({ text: "+1(1-3)% to Chaos", rolls: [{ value: 1, min: 1, max: 3 }], unscalable: true }); // range kept in text
  });
});

describe("parseModSection", () => {
  it("files the lines under the header above them, keeping a two-line suffix as one modifier", () => {
    const lines = [
      "{ Prefix Modifier \"Sapphire\" (Tier: 10) — Mana }",
      "+30(30-34) to maximum Mana",
      "{ Suffix Modifier \"of Radiance\" (Tier: 1) — Attack }",
      "17(16-20)% increased Global Accuracy Rating",
      "15% increased Light Radius",
    ];

    const { mods } = parseModSection(lines);

    expect(mods.map((mod) => mod.lines.map((line) => line.text))).toEqual([
      ["+30(30-34) to maximum Mana"],
      ["17(16-20)% increased Global Accuracy Rating", "15% increased Light Radius"],
    ]);
  });

  it("files a line wrapped in parentheses as reminder text rather than a modifier line", () => {
    const { mods } = parseModSection(["{ Implicit Modifier }", "Inflict Brittle", "(Hits have more Crit)"]);

    expect([mods[0]?.lines.length, mods[0]?.reminders]).toEqual([1, ["(Hits have more Crit)"]]);
  });

  it("sets aside a line that comes before the first header", () => {
    const section = parseModSection(["stray", "{ Implicit Modifier }", "text"]);

    expect([section.orphans, section.mods.length]).toEqual([["stray"], 1]); // reported by the caller
  });

  it("keeps a header that has no lines under it", () => {
    const { mods } = parseModSection(["{ Implicit Modifier }"]);

    expect(mods[0]?.lines).toEqual([]);
  });
});

describe("suffixMod", () => {
  it("turns an enchant line into a modifier whose only qualifier is enchant", () => {
    const result = suffixMod("Allocates Discipline and Training", "enchant");

    expect(result).toEqual({
      header: { raw: "enchant", affix: "other", name: "", tier: undefined, tags: [], qualifiers: ["enchant"], extra: [] },
      lines: [{ text: "Allocates Discipline and Training", rolls: [], unscalable: false }],
      reminders: [],
    }); // matcher reads it like "Master Crafted"
  });

  it("uses the suffix as the position when it is implicit", () => {
    const result = suffixMod("x", "implicit");

    expect(result.header.affix).toBe("implicit");
  });
});
