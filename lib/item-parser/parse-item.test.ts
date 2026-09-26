import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "node:fs";
import { parseItem, property } from "./parse-item.ts";

const sample = (name: string) =>
  readFileSync(new URL(`../../data/sample-items/${name}.txt`, import.meta.url), "utf8");

describe("parseItem", () => {
  it("reports an empty item and nothing else for blank text", () => {
    expect(parseItem("\n--------\n").issues).toEqual([{ kind: "empty-item", line: "", section: 0 }]);
  });

  it("reads a rare ring's header, requirements, properties and mods", () => {
    const item = parseItem(sample("rare-ring"));

    expect([item.name, item.baseType, item.requirements.map((r) => r.name), property(item, "Item Level")?.numbers]).toEqual([
      "Maelström Circle",
      "Amethyst Ring",
      ["Level"],
      [85],
    ]);
    expect(item.mods.map((mod) => mod.header.affix)).toEqual(["implicit", "prefix", "prefix", "suffix", "suffix"]);
  });

  it("takes sockets out of the properties and reads trailing flags", () => {
    const item = parseItem(sample("influenced-rare"));

    expect([item.sockets, property(item, "Sockets"), item.flags]).toEqual([["WWW"], undefined, ["Shaper Item"]]);
  });

  it("keeps flavour text verbatim as an extra section", () => {
    const item = parseItem(sample("item-with-enchant"));

    expect(item.extraSections).toHaveLength(1);
    expect(item.extraSections[0]?.[0]).toBe("Betrayal bites cold as a southerly wind,");
  });

  it("reads a suffixed enchant line as a modifier", () => {
    const item = parseItem(sample("item-with-enchant"));

    expect(item.mods[0]?.header.qualifiers).toEqual(["enchant"]);
  });

  it("reads a short bare line on a divination card as a flag", () => {
    expect(parseItem(sample("divination-card")).flags).toEqual(["10x Exalted Orb"]);
  });

  it("keeps a non-property line in a requirements section as an extra section", () => {
    const item = parseItem("X\n--------\nRequirements:\nLevel: 5\nstrange line");

    expect([item.flags, item.extraSections]).toEqual([[], [["strange line"]]]);
  });

  it("reports a line before the first header in a mod section with its 1-based section", () => {
    expect(parseItem("X\n--------\nstray\n{ Implicit Modifier }\ntext").issues).toEqual([
      { kind: "orphan-mod-line", line: "stray", section: 2 },
    ]);
  });

  it("keeps the last sockets line when an item prints two", () => {
    expect(parseItem("X\n--------\nSockets: R\n--------\nSockets: G-G").sockets).toEqual(["GG"]);
  });

  it("keeps a prose line in a key-value section as an extra section, not a flag", () => {
    const item = parseItem("X\n--------\nLevel: 1\nThis is a long sentence of prose.");

    expect([item.flags, item.extraSections]).toEqual([[], [["This is a long sentence of prose."]]]);
  });
});

describe("property", () => {
  it("returns the first property of that name", () => {
    const item = parseItem("X\n--------\nLevel: 1\nLevel: 2");

    expect(property(item, "Level")?.value).toBe("1");
  });
});
