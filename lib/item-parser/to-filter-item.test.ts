import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "node:fs";
import { parseItem } from "./parse-item.ts";
import { toFilterItem } from "./to-filter-item.ts";

const sample = (name: string) =>
  toFilterItem(parseItem(readFileSync(new URL(`../../data/sample-items/${name}.txt`, import.meta.url), "utf8")));

const text = (body: string) => toFilterItem(parseItem(body));

describe("toFilterItem", () => {
  describe("defaults", () => {
    it("fills a default for every condition on an item that is only a base type", () => {
      const item = text("Scrap");

      expect(item).toMatchObject({
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
      }); // a missing key would fail every condition
    });

    it("leaves the map tier off entirely when nothing names one", () => {
      const item = text("Scrap");

      expect("MapTier" in item).toBe(false); // absent, not 0
    });

    it("reads a divination card's stack size from the first number of its property", () => {
      const item = sample("divination-card");

      expect(item.StackSize).toBe(1); // "1/10" gives 1
    });

    it("reads a rarity outside the filter's ladder as Normal", () => {
      const item = sample("divination-card");

      expect(item.Rarity).toBe("Normal"); // "Divination Card" is not on the ladder
    });
  });

  describe("maps", () => {
    it("reads a blighted map's tier from its name and marks it blighted", () => {
      const item = sample("blighted-map");

      expect([item.MapTier, item.BlightedMap]).toEqual([16, true]);
    });

    it("prefers the Map Tier line over the tier in the name", () => {
      const item = text("Map (Tier 3)\n--------\nMap Tier: 14");

      expect(item.MapTier).toBe(14);
    });

    it("reads a Blight-ravaged map as uber blighted and not as plain blighted", () => {
      const item = sample("blight-ravaged-map");

      expect([item.UberBlightedMap, item.BlightedMap]).toEqual([true, false]); // different prefixes
    });
  });

  describe("sockets and modifiers", () => {
    it("reads an influenced rare's influence, sockets, links and affix names", () => {
      const item = sample("influenced-rare");

      expect([item.HasInfluence, item.ShaperItem, item.Sockets, item.LinkedSockets, item.HasExplicitMod]).toEqual([
        ["Shaper"],
        true,
        "WWW",
        3,
        ["Unwavering", "Vigorous", "Upgraded", "of the Magma", "of Stoicism", "of Shaping"],
      ]); // affix names come from the quoted header name
    });

    it("counts two unlinked sockets as no link", () => {
      const item = text("X\n--------\nSockets: R G");

      expect(item.LinkedSockets).toBe(0); // one socket is not a link
    });

    it("lists an enchant line as an enchantment", () => {
      const item = sample("item-with-enchant");

      expect(item.HasEnchantment).toEqual(["Allocates Discipline and Training"]);
    });

    it("marks fractured and scourged from header words written in any case", () => {
      const item = text("X\n--------\n{ FRACTURED Prefix Modifier }\na\n{ Scourge Modifier }\nb");

      expect([item.FracturedItem, item.Scourged]).toEqual([true, true]);
    });

    it("counts two corruption implicits", () => {
      const item = text("X\n--------\n{ Corruption Implicit Modifier }\na\n{ Corruption Implicit Modifier }\nb");

      expect(item.CorruptedMods).toBe(2);
    });
  });

  describe("flags", () => {
    it("reads corrupted, mirrored and unidentified from the item's flag lines", () => {
      const item = text("X\n--------\nCorrupted\nMirrored\nUnidentified");

      expect([item.Corrupted, item.Mirrored, item.Identified]).toEqual([true, true, false]); // Identified is the inverse
    });

    it("marks a unique whose name starts with Replica as a replica", () => {
      const item = text("Rarity: Unique\nReplica Thing\nBase");

      expect(item.Replica).toBe(true);
    });
  });
});
