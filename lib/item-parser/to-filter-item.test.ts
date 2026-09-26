import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "node:fs";
import { parseItem } from "./parse-item.ts";
import { toFilterItem } from "./to-filter-item.ts";

const sample = (name: string) =>
  toFilterItem(parseItem(readFileSync(new URL(`../../data/sample-items/${name}.txt`, import.meta.url), "utf8")));

const text = (body: string) => toFilterItem(parseItem(body));

describe("toFilterItem", () => {
  it("fills defaults on an item with nothing but a base type", () => {
    expect(text("Scrap")).toMatchObject({
      Class: "",
      BaseType: "Scrap",
      Rarity: "Normal",
      ItemLevel: 0,
      Quality: 0,
      StackSize: 1,
      Sockets: "",
      LinkedSockets: 0,
      Corrupted: false,
      Identified: true,
      HasInfluence: [],
      HasEnchantment: [],
      HasExplicitMod: [],
    });
  });

  it("omits the map tier when nothing names one", () => {
    expect("MapTier" in text("Scrap")).toBe(false);
  });

  it("reads a blighted map's tier from its name", () => {
    expect([sample("blighted-map").MapTier, sample("blighted-map").BlightedMap]).toEqual([16, true]);
  });

  it("prefers the Map Tier property over the name", () => {
    expect(text("Map (Tier 3)\n--------\nMap Tier: 14").MapTier).toBe(14);
  });

  it("reads Blight-ravaged as uber blighted and not as blighted", () => {
    const item = sample("blight-ravaged-map");

    expect([item.UberBlightedMap, item.BlightedMap]).toEqual([true, false]);
  });

  it("reads rarities outside the filter's ladder as Normal", () => {
    expect(sample("divination-card").Rarity).toBe("Normal");
  });

  it("reads influences, sockets and the affix names of an influenced rare", () => {
    const item = sample("influenced-rare");

    expect([item.HasInfluence, item.ShaperItem, item.Sockets, item.LinkedSockets, item.HasExplicitMod]).toEqual([
      ["Shaper"],
      true,
      "WWW",
      3,
      ["Unwavering", "Vigorous", "Upgraded", "of the Magma", "of Stoicism", "of Shaping"],
    ]);
  });

  it("counts a single socket as no link", () => {
    expect(text("X\n--------\nSockets: R G").LinkedSockets).toBe(0);
  });

  it("lists a suffixed enchant as an enchantment", () => {
    expect(sample("item-with-enchant").HasEnchantment).toEqual(["Allocates Discipline and Training"]);
  });

  it("reads corruption, mirroring and unidentified from flags", () => {
    const item = text("X\n--------\nCorrupted\nMirrored\nUnidentified");

    expect([item.Corrupted, item.Mirrored, item.Identified]).toEqual([true, true, false]);
  });

  it("marks fractured and scourged from header words in any case", () => {
    const item = text("X\n--------\n{ FRACTURED Prefix Modifier }\na\n{ Scourge Modifier }\nb");

    expect([item.FracturedItem, item.Scourged]).toEqual([true, true]);
  });

  it("counts corruption-qualified modifiers", () => {
    expect(text("X\n--------\n{ Corruption Implicit Modifier }\na\n{ Corruption Implicit Modifier }\nb").CorruptedMods).toBe(2);
  });

  it("marks a replica from its name", () => {
    expect(text("Rarity: Unique\nReplica Thing\nBase").Replica).toBe(true);
  });

  it("reads stack size from the first number of the property", () => {
    expect(sample("divination-card").StackSize).toBe(1);
  });
});
