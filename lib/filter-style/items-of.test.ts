import { describe, it, expect } from "@jest/globals";
import { itemsOf } from "./items-of.ts";
import type { CatalogRow, UniqueListing } from "./types.ts";

const listing = (name: string, meanPrice: number, corrupted = false, lowConfidence = false): UniqueListing => ({
  name,
  meanPrice,
  corrupted,
  ...(lowConfidence
    ? { lowConfidence }
    : {}),
});

const base = (listings: UniqueListing[], subcategory: string | null = null): CatalogRow => ({
  key: "base-plate",
  name: "Glorious Plate",
  category: "armour",
  subcategory: "body",
  baseTypes: ["Glorious Plate"],
  meanPrice: 1,
  uniques: [{ category: "unique", subcategory, listings }],
});

const uniqueRow = (extra: Partial<CatalogRow> = {}): CatalogRow => ({
  key: "unique-plate",
  name: "Unique Glorious Plate",
  category: "unique",
  subcategory: "regular",
  baseTypes: ["Glorious Plate"],
  ...extra,
});

describe("itemsOf", () => {
  describe("plain rows", () => {
    it("turns a row without variants into one item priced as a take", () => {
      const rows: CatalogRow[] = [
        {
          key: "k",
          name: "Chaos Orb",
          category: "currency",
          subcategory: null,
          baseTypes: ["Chaos Orb"],
          meanPrice: 1,
        },
      ];

      expect(itemsOf(rows)).toEqual([{ name: "Chaos Orb", key: "k", category: "currency", prices: { take: 1 } }]);
    });

    it("turns each variant into its own item named after the row and the variant", () => {
      const rows: CatalogRow[] = [
        {
          key: "k",
          name: "Gem",
          category: "gems",
          subcategory: null,
          baseTypes: [],
          meanPrice: 99,
          variants: [{ name: "20/20", meanPrice: 4 }, { name: "1/0" }],
        },
      ];

      expect(itemsOf(rows)).toEqual([
        { name: "Gem (20/20)", key: "k", variant: "20/20", category: "gems", prices: { take: 4 } },
        { name: "Gem (1/0)", key: "k", variant: "1/0", category: "gems", prices: {} }, // no fallback to the row price
      ]);
    });

    it("treats an empty variant list like no variants", () => {
      const rows: CatalogRow[] = [
        { key: "k", name: "A", category: "c", subcategory: null, baseTypes: [], variants: [] },
      ];

      expect(itemsOf(rows)).toHaveLength(1);
    });

    it("never reads a low-confidence price", () => {
      const rows: CatalogRow[] = [
        { key: "k", name: "A", category: "c", subcategory: null, baseTypes: [], meanPrice: 50, lowConfidence: true },
      ];

      expect(itemsOf(rows)[0]?.prices).toEqual({});
    });

    it("never reads a price that is not a finite number", () => {
      const rows: CatalogRow[] = [
        { key: "k", name: "A", category: "c", subcategory: null, baseTypes: [], meanPrice: NaN },
      ];

      expect(itemsOf(rows)[0]?.prices).toEqual({});
    });

    it("flags a variant unpriceable when its row is", () => {
      const rows: CatalogRow[] = [
        {
          key: "k",
          name: "A",
          category: "c",
          subcategory: null,
          baseTypes: [],
          unpriceable: true,
          variants: [{ name: "v" }],
        },
      ];

      expect(itemsOf(rows)[0]?.unpriceable).toBe(true);
    });
  });

  describe("unique rows", () => {
    it("prices a unique row off its base row's list, cheapest as take and dearest as check", () => {
      const items = itemsOf([base([listing("A", 5), listing("B", 80)]), uniqueRow()]);

      expect(items[1]?.prices).toEqual({ take: 5, check: 80 });
    });

    it("leaves out low-confidence forms from the list", () => {
      const items = itemsOf([base([listing("A", 5), listing("B", 80, false, true)]), uniqueRow()]);

      expect(items[1]?.prices).toEqual({ take: 5 });
    });

    it("adds a gamble from the corrupted forms on the same base", () => {
      const items = itemsOf([base([listing("A", 5), listing("A", 300, true)]), uniqueRow()]);

      expect(items[1]?.prices).toEqual({ take: 5, gamble: 300 });
    });

    it("prices a corrupted unique row off the corrupted forms only, as a check", () => {
      const row = uniqueRow({ conditions: [{ condition: "Corrupted", value: true }] });

      const items = itemsOf([base([listing("A", 5), listing("A", 300, true)]), row]);

      expect(items[1]?.prices).toEqual({ check: 300 });
    });

    it("falls back to the row's own price when the base carries no usable form", () => {
      const items = itemsOf([uniqueRow({ meanPrice: 12 })]);

      expect(items[0]?.prices).toEqual({ take: 12 });
    });

    it("reads a foulborn row's list off the foulborn group", () => {
      const row = uniqueRow({ category: "foulborn", subcategory: null });

      const items = itemsOf([base([listing("F", 40)], "foulborn"), row]);

      expect(items[1]?.prices).toEqual({ take: 40 });
    });

    it("finds no list for a unique row with no subcategory outside foulborn", () => {
      const items = itemsOf([base([listing("A", 5)]), uniqueRow({ subcategory: null, meanPrice: 9 })]);

      expect(items[1]?.prices).toEqual({ take: 9 });
    });

    it("files a unique-rarity variant of a non-unique row under unique, priced off the regular list", () => {
      const row: CatalogRow = {
        key: "jewel",
        name: "Cobalt Jewel",
        category: "jewels",
        subcategory: "base",
        baseTypes: ["Glorious Plate"],
        variants: [{ name: "unique", conditions: [{ condition: "Rarity", operator: "==", value: ["Unique"] }] }],
      };

      const items = itemsOf([base([listing("A", 5)]), row]);

      expect([items[1]?.category, items[1]?.prices]).toEqual(["unique", { take: 5 }]);
    });
  });
});
