import { describe, expect, it } from "@jest/globals";
import { pricesOf } from "./prices-of.ts";
import type { PricedRow } from "./types.ts";

const CORRUPTED = [{ condition: "Corrupted", value: true }];
const UNCORRUPTED = [{ condition: "Corrupted", value: false }];

const rowWith = (fields: Partial<PricedRow>): PricedRow => ({
  key: "Metadata/Items/Belts/Belt4",
  name: "Heavy Belt",
  category: "bases",
  subcategory: "belt",
  ...fields,
});

describe("pricesOf", () => {
  describe("a row with no variants", () => {
    it("is worth its own price, both at its cheapest and at its best", () => {
      const row = rowWith({ meanPrice: 12 });

      expect(pricesOf(row)).toEqual({ take: 12, check: 12 });
    });

    it("is worth nothing when its only price came from a thin sample", () => {
      const row = rowWith({ meanPrice: 5292, lowConfidence: true });

      expect(pricesOf(row)).toEqual({});
    });
  });

  describe("a row with variants", () => {
    it("is worth its cheapest variant as it lies and its dearest at best", () => {
      const row = rowWith({
        variants: [
          { name: "ilvl 83", meanPrice: 1 },
          { name: "ilvl 85", meanPrice: 4 },
          { name: "ilvl 86", meanPrice: 40 },
        ],
      });

      expect(pricesOf(row)).toEqual({ take: 1, check: 40 });
    });

    it("ignores its own price once it has variants", () => {
      const row = rowWith({
        meanPrice: 999,
        variants: [{ name: "ilvl 86", meanPrice: 7 }],
      });

      expect(pricesOf(row)).toEqual({ take: 7, check: 7 });
    });

    it("ignores a variant nobody priced", () => {
      const row = rowWith({
        variants: [
          { name: "ilvl 83" },
          { name: "ilvl 86", meanPrice: 30 },
        ],
      });

      expect(pricesOf(row)).toEqual({ take: 30, check: 30 });
    });

    it("ignores a variant priced off a thin sample", () => {
      const row = rowWith({
        variants: [
          { name: "ilvl 83", meanPrice: 2 },
          { name: "ilvl 86", meanPrice: 44100, lowConfidence: true },
        ],
      });

      expect(pricesOf(row)).toEqual({ take: 2, check: 2 });
    });

    it("is worth nothing when every variant came from a thin sample", () => {
      const row = rowWith({
        meanPrice: 60,
        variants: [
          { name: "ilvl 83", meanPrice: 2, lowConfidence: true },
          { name: "ilvl 86", meanPrice: 44100, lowConfidence: true },
        ],
      });

      expect(pricesOf(row)).toEqual({});
    });
  });

  describe("a form that has to be corrupted first", () => {
    it("counts as the gamble price and not as what the item is worth as it lies", () => {
      const row = rowWith({
        variants: [
          { name: "normal", meanPrice: 1, conditions: UNCORRUPTED },
          { name: "corrupted", meanPrice: 25, conditions: CORRUPTED },
        ],
      });

      expect(pricesOf(row)).toEqual({ take: 1, check: 1, gamble: 25 });
    });

    it("is recognised by the variant asking for corrupted items", () => {
      const namedCorrupted = rowWith({
        variants: [{ name: "corrupted", meanPrice: 25, conditions: UNCORRUPTED }],
      });

      expect(pricesOf(namedCorrupted)).toEqual({ take: 25, check: 25 });
    });

    it("leaves an item worth nothing uncorrupted with only a gamble price", () => {
      const row = rowWith({
        variants: [{ name: "corrupted", meanPrice: 130, conditions: CORRUPTED }],
      });

      expect(pricesOf(row)).toEqual({ gamble: 130 });
    });

    it("takes the dearest corruption when several are priced", () => {
      const row = rowWith({
        variants: [
          { name: "normal", meanPrice: 1, conditions: UNCORRUPTED },
          { name: "corrupted rarity", meanPrice: 25, conditions: CORRUPTED },
          { name: "corrupted movement speed", meanPrice: 999, conditions: CORRUPTED },
        ],
      });

      expect(pricesOf(row)).toEqual({ take: 1, check: 1, gamble: 999 });
    });
  });
});
