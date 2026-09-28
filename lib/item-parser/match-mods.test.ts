import { describe, it, expect } from "@jest/globals";
import { modMatcher, resolveMod } from "./match-mods.ts";
import { parseModSection } from "./parse-mods.ts";
import type { ItemMod, PublishedStat } from "./types.ts";

const mod = (...lines: string[]): ItemMod => {
  const found = parseModSection(lines).mods[0];
  if (found === undefined) throw new Error("no mod");
  return found;
};

const stats: PublishedStat[] = [
  { id: "explicit.life", text: "+# to maximum Life", type: "explicit" },
  { id: "implicit.life", text: "+# to maximum Life", type: "implicit" },
  { id: "crafted.life", text: "+# to maximum Life", type: "crafted" },
  { id: "explicit.charges", text: "#% increased Charges per use", type: "explicit" },
  { id: "explicit.hybrid", text: "#% increased Armour\n+# to maximum Life", type: "explicit" },
  { id: "explicit.acc", text: "#% increased Global Accuracy Rating", type: "explicit" },
  { id: "explicit.light", text: "#% increased Light Radius", type: "explicit" },
  { id: "pseudo.room", text: "Has Room: #", type: "pseudo", options: [{ id: 7, text: "Apex of Ascension" }] },
  { id: "explicit.per", text: "# to Chaos per 10 Dex", type: "explicit" },
];

const matcher = modMatcher(stats);

describe("modMatcher", () => {
  it("finds every type GGG publishes a prefix's wording under, with the explicit one first and the rolled value read off", () => {
    const { stats: found } = matcher.match(mod("{ Prefix Modifier }", "+149(145-159) to maximum Life"));

    expect(found.map((stat) => [stat.id, stat.preferred, stat.values])).toEqual([
      ["explicit.life", true, [149]],
      ["implicit.life", false, [149]],
      ["crafted.life", false, [149]],
    ]); // nothing filtered, only reordered
  });

  it("puts the implicit stat first for an implicit modifier", () => {
    const { stats: found } = matcher.match(mod("{ Implicit Modifier }", "+5 to maximum Life"));

    expect(found[0]?.id).toBe("implicit.life");
  });

  it("puts the crafted stat first when the header says Master Crafted, keeping the rest in published order", () => {
    const { stats: found } = matcher.match(mod("{ Master Crafted Prefix Modifier }", "+5 to maximum Life"));

    expect(found.map((stat) => stat.id)).toEqual(["crafted.life", "explicit.life", "implicit.life"]); // stable sort
  });

  it("matches 28% reduced to the increased stat at -28", () => {
    const { stats: found } = matcher.match(mod("{ Prefix Modifier }", "28(20-30)% reduced Charges per use"));

    expect(found.map((stat) => [stat.id, stat.values])).toEqual([["explicit.charges", [-28]]]); // tried only after the printed wording missed
  });

  it("matches a hybrid's two lines as one stat with both values", () => {
    const { stats: found } = matcher.match(mod("{ Prefix Modifier }", "20% increased Armour", "+10 to maximum Life"));

    expect(found.map((stat) => [stat.id, stat.values])).toEqual([["explicit.hybrid", [20, 10]]]); // joined tried first
  });

  it("matches each line on its own when the two lines together match nothing", () => {
    const { stats: found } = matcher.match(mod("{ Suffix Modifier }", "17(16-20)% increased Global Accuracy Rating", "15% increased Light Radius"));

    expect(found.map((stat) => stat.id)).toEqual(["explicit.acc", "explicit.light"]); // every line looked up, not first hit
  });

  it("matches nothing for a single line GGG never published", () => {
    const result = matcher.match(mod("{ Prefix Modifier }", "Nothing like it"));

    expect(result).toEqual({ stats: [], pseudos: [] });
  });

  it("matches a temple room to its pseudo stat alone and reports which option it was", () => {
    const result = matcher.match(mod("{ Implicit Modifier }", "Has Room: Apex of Ascension"));

    expect([result.stats, result.pseudos.map((stat) => [stat.id, stat.option, stat.values])]).toEqual([[], [["pseudo.room", 7, []]]]); // option text substituted into the key
  });

  it("falls back to the printed roll when the stat's wording differs only in a literal number", () => {
    const { stats: found } = matcher.match(mod("{ Prefix Modifier }", "5(1-9) to Chaos per 12 Dex"));

    expect(found.map((stat) => [stat.id, stat.values])).toEqual([["explicit.per", [5]]]); // 10 vs 12 fails alignment, key still matches
  });
});

describe("resolveMod", () => {
  it("keeps the modifier as it was and adds what it matched", () => {
    const resolved = resolveMod(mod("{ Prefix Modifier }", "+5 to maximum Life"), matcher);

    expect([resolved.header.affix, resolved.stats.length, resolved.pseudos]).toEqual(["prefix", 3, []]);
  });
});
