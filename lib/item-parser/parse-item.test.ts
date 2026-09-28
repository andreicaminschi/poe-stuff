import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "node:fs";
import { parseItem, property } from "./parse-item.ts";

const sample = (name: string) => readFileSync(new URL(`../../data/sample-items/${name}.txt`, import.meta.url), "utf8");

describe("parseItem", () => {
  it("reports an empty item, and nothing else, for text that is only a separator", () => {
    const item = parseItem("\n--------\n");

    expect(item.issues).toEqual([{ kind: "empty-item", line: "", section: 0 }]);
  });

  it("reads a rare ring's name, base type, requirements and item level", () => {
    const item = parseItem(sample("rare-ring"));

    expect([item.name, item.baseType, item.requirements.map((r) => r.name), property(item, "Item Level")?.numbers]).toEqual([
      "Maelström Circle",
      "Amethyst Ring",
      ["Level"],
      [85],
    ]);
  });

  it("reads a rare ring's implicit, two prefixes and two suffixes in order", () => {
    const item = parseItem(sample("rare-ring"));

    expect(item.mods.map((mod) => mod.header.affix)).toEqual(["implicit", "prefix", "prefix", "suffix", "suffix"]);
  });

  it("takes the sockets out of the properties and reads the Shaper line as a flag", () => {
    const item = parseItem(sample("influenced-rare"));

    expect([item.sockets, property(item, "Sockets"), item.flags]).toEqual([["WWW"], undefined, ["Shaper Item"]]); // sockets get their own field
  });

  it("keeps flavour text exactly as written in a section of its own", () => {
    const item = parseItem(sample("item-with-enchant"));

    expect([item.extraSections.length, item.extraSections[0]?.[0]]).toEqual([1, "Betrayal bites cold as a southerly wind,"]); // one prose line makes the whole section prose
  });

  it("reads a line ending in (enchant) as an enchant modifier", () => {
    const item = parseItem(sample("item-with-enchant"));

    expect(item.mods[0]?.header.qualifiers).toEqual(["enchant"]);
  });

  it("reads a divination card's short reward line as a flag", () => {
    const item = parseItem(sample("divination-card"));

    expect(item.flags).toEqual(["10x Exalted Orb"]);
  });

  it("keeps a line in the requirements section that is not a requirement as its own section", () => {
    const item = parseItem("X\n--------\nRequirements:\nLevel: 5\nstrange line");

    expect([item.flags, item.extraSections]).toEqual([[], [["strange line"]]]); // nothing is dropped
  });

  it("reports a line that comes before the first modifier header, numbering sections from one", () => {
    const item = parseItem("X\n--------\nstray\n{ Implicit Modifier }\ntext");

    expect(item.issues).toEqual([{ kind: "orphan-mod-line", line: "stray", section: 2 }]); // header section is 1
  });

  it("keeps the second sockets line when an item prints two", () => {
    const item = parseItem("X\n--------\nSockets: R\n--------\nSockets: G-G");

    expect(item.sockets).toEqual(["GG"]); // last one wins
  });

  it("keeps a sentence in a key-value section as prose, not as a flag", () => {
    const item = parseItem("X\n--------\nLevel: 1\nThis is a long sentence of prose.");

    expect([item.flags, item.extraSections]).toEqual([[], [["This is a long sentence of prose."]]]);
  });
});

describe("property", () => {
  it("gives the first of two properties with the same name", () => {
    const item = parseItem("X\n--------\nLevel: 1\nLevel: 2");

    const found = property(item, "Level");

    expect(found?.value).toBe("1");
  });
});
