import { describe, it, expect } from "@jest/globals";
import { isModHeader, parseModHeader, parseModLine, parseModSection, suffixMod } from "./parse-mods.ts";

describe("isModHeader", () => {
  it("accepts a line wrapped in braces", () => {
    expect(isModHeader("{ Implicit Modifier }")).toBe(true);
  });

  it("rejects a line with text after the closing brace", () => {
    expect(isModHeader("{ Implicit Modifier } x")).toBe(false);
  });
});

describe("parseModHeader", () => {
  it("reads a crafted prefix into affix, name, tags and qualifiers", () => {
    expect(parseModHeader('{ Master Crafted Prefix Modifier "Upgraded" — Gem }')).toEqual({
      raw: 'Master Crafted Prefix Modifier "Upgraded" — Gem',
      affix: "prefix",
      name: "Upgraded",
      tier: undefined,
      tags: ["Gem"],
      qualifiers: ["Master", "Crafted"],
      extra: [],
    });
  });

  it("reads the tier and every comma-separated tag", () => {
    const header = parseModHeader('{ Suffix Modifier "of the Magma" (Tier: 2) — Elemental, Fire, Resistance }');

    expect([header.affix, header.name, header.tier, header.tags]).toEqual([
      "suffix",
      "of the Magma",
      2,
      ["Elemental", "Fire", "Resistance"],
    ]);
  });

  it("classes a header with no affix word as other and keeps its words as qualifiers", () => {
    const header = parseModHeader("{ Unique Modifier }");

    expect([header.affix, header.qualifiers, header.tags]).toEqual(["other", ["Unique"], []]);
  });

  it("keeps every clause after the first as extra", () => {
    expect(parseModHeader("{ Unique Modifier — Life — 20% Increased — More }").extra).toEqual([
      "20% Increased",
      "More",
    ]);
  });

  it("classes a header with two different affix words as other", () => {
    expect(parseModHeader("{ Suffix Prefix Modifier }").affix).toBe("other");
  });

  it("uses the whole line as raw when it has no braces", () => {
    expect(parseModHeader("Implicit Modifier").raw).toBe("Implicit Modifier");
  });
});

describe("parseModLine", () => {
  it("reads rolls and the unscalable note off one line", () => {
    expect(parseModLine("+1(1-3)% to Chaos — Unscalable Value")).toEqual({
      text: "+1(1-3)% to Chaos",
      rolls: [{ value: 1, min: 1, max: 3 }],
      unscalable: true,
    });
  });
});

describe("parseModSection", () => {
  it("groups the lines under each header and keeps a hybrid's lines together", () => {
    const { mods } = parseModSection([
      '{ Prefix Modifier "Sapphire" (Tier: 10) — Mana }',
      "+30(30-34) to maximum Mana",
      '{ Suffix Modifier "of Radiance" (Tier: 1) — Attack }',
      "17(16-20)% increased Global Accuracy Rating",
      "15% increased Light Radius",
    ]);

    expect(mods.map((mod) => mod.lines.map((line) => line.text))).toEqual([
      ["+30(30-34) to maximum Mana"],
      ["17(16-20)% increased Global Accuracy Rating", "15% increased Light Radius"],
    ]);
  });

  it("files a fully bracketed line as reminder text rather than a modifier line", () => {
    const { mods } = parseModSection(["{ Implicit Modifier }", "Inflict Brittle", "(Hits have more Crit)"]);

    expect([mods[0]?.lines.length, mods[0]?.reminders]).toEqual([1, ["(Hits have more Crit)"]]);
  });

  it("reports lines before the first header as orphans", () => {
    const section = parseModSection(["stray", "{ Implicit Modifier }", "text"]);

    expect([section.orphans, section.mods.length]).toEqual([["stray"], 1]);
  });

  it("keeps a header with no lines under it", () => {
    expect(parseModSection(["{ Implicit Modifier }"]).mods[0]?.lines).toEqual([]);
  });
});

describe("suffixMod", () => {
  it("makes the suffix the header's only qualifier with affix other", () => {
    expect(suffixMod("Allocates Discipline and Training", "enchant")).toEqual({
      header: { raw: "enchant", affix: "other", name: "", tier: undefined, tags: [], qualifiers: ["enchant"], extra: [] },
      lines: [{ text: "Allocates Discipline and Training", rolls: [], unscalable: false }],
      reminders: [],
    });
  });

  it("uses the suffix as the affix when it is an affix word", () => {
    expect(suffixMod("x", "implicit").header.affix).toBe("implicit");
  });
});
