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
  it("returns every type for a line, the explicit first by default", () => {
    const { stats: found } = matcher.match(mod("{ Prefix Modifier }", "+149(145-159) to maximum Life"));

    expect(found.map((stat) => [stat.id, stat.preferred, stat.values])).toEqual([
      ["explicit.life", true, [149]],
      ["implicit.life", false, [149]],
      ["crafted.life", false, [149]],
    ]);
  });

  it("prefers the implicit type for an implicit header", () => {
    expect(matcher.match(mod("{ Implicit Modifier }", "+5 to maximum Life")).stats[0]?.id).toBe("implicit.life");
  });

  it("prefers the type a header word names", () => {
    const found = matcher.match(mod("{ Master Crafted Prefix Modifier }", "+5 to maximum Life")).stats;

    expect(found.map((stat) => stat.id)).toEqual(["crafted.life", "explicit.life", "implicit.life"]);
  });

  it("matches a reduced modifier to the increased stat with a negative value", () => {
    const found = matcher.match(mod("{ Prefix Modifier }", "28(20-30)% reduced Charges per use")).stats;

    expect(found.map((stat) => [stat.id, stat.values])).toEqual([["explicit.charges", [-28]]]);
  });

  it("matches a hybrid's two lines as one stat", () => {
    const found = matcher.match(mod("{ Prefix Modifier }", "20% increased Armour", "+10 to maximum Life")).stats;

    expect(found.map((stat) => [stat.id, stat.values])).toEqual([["explicit.hybrid", [20, 10]]]);
  });

  it("falls back to one match per line when the joined lines match nothing", () => {
    const found = matcher.match(
      mod("{ Suffix Modifier }", "17(16-20)% increased Global Accuracy Rating", "15% increased Light Radius"),
    ).stats;

    expect(found.map((stat) => stat.id)).toEqual(["explicit.acc", "explicit.light"]);
  });

  it("returns nothing for a single line that matches nothing", () => {
    expect(matcher.match(mod("{ Prefix Modifier }", "Nothing like it"))).toEqual({ stats: [], pseudos: [] });
  });

  it("expands an option list and reports the chosen option on a pseudo-only hit", () => {
    const result = matcher.match(mod("{ Implicit Modifier }", "Has Room: Apex of Ascension"));

    expect([result.stats, result.pseudos.map((stat) => [stat.id, stat.option, stat.values])]).toEqual([
      [],
      [["pseudo.room", 7, []]],
    ]);
  });

  it("uses the printed rolls when the stat text does not line up literally", () => {
    const found = matcher.match(mod("{ Prefix Modifier }", "5(1-9) to Chaos per 12 Dex")).stats;

    expect(found.map((stat) => [stat.id, stat.values])).toEqual([["explicit.per", [5]]]);
  });
});

describe("resolveMod", () => {
  it("keeps the modifier and attaches its matches", () => {
    const resolved = resolveMod(mod("{ Prefix Modifier }", "+5 to maximum Life"), matcher);

    expect([resolved.header.affix, resolved.stats.length, resolved.pseudos]).toEqual(["prefix", 3, []]);
  });
});
