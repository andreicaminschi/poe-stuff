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

const plain = (extra: Partial<CatalogRow> = {}): CatalogRow => ({
  key: "k",
  name: "A",
  category: "c",
  subcategory: null,
  baseTypes: [],
  ...extra,
});

describe("itemsOf", () => {
  describe("plain rows", () => {
    it("turns a row with no variants into one item that is a take at its price", () => {
      const rows = [plain({ name: "Chaos Orb", category: "currency", baseTypes: ["Chaos Orb"], meanPrice: 1 })];

      const items = itemsOf(rows);

      expect(items).toEqual([{ name: "Chaos Orb", key: "k", category: "currency", prices: { take: 1 } }]); // no variant key
    });

    it("turns each variant into its own item named after the row and variant, with no fallback to the row's price", () => {
      const rows = [plain({ name: "Gem", category: "gems", meanPrice: 99, variants: [{ name: "20/20", meanPrice: 4 }, { name: "1/0" }] })];

      const items = itemsOf(rows);

      expect(items).toEqual([
        { name: "Gem (20/20)", key: "k", variant: "20/20", category: "gems", prices: { take: 4 } },
        { name: "Gem (1/0)", key: "k", variant: "1/0", category: "gems", prices: {} },
      ]); // the row's 99 is never read
    });

    it("turns a row with an empty variant list into one item", () => {
      const items = itemsOf([plain({ variants: [] })]);

      expect(items.map((i) => i.name)).toEqual(["A"]); // length 0 guard
    });

    it("never reads a low-confidence price", () => {
      const items = itemsOf([plain({ meanPrice: 50, lowConfidence: true })]);

      expect(items[0]?.prices).toEqual({});
    });

    it("never reads a price that is not a finite number", () => {
      const items = itemsOf([plain({ meanPrice: NaN })]);

      expect(items[0]?.prices).toEqual({}); // NaN would poison min/max
    });

    it("marks every variant unpriceable when its row is", () => {
      const items = itemsOf([plain({ unpriceable: true, variants: [{ name: "v" }] })]);

      expect(items[0]?.unpriceable).toBe(true); // inherited from the row
    });

    it("marks only the variant that is unpriceable, not its sibling", () => {
      const items = itemsOf([plain({ variants: [{ name: "a", unpriceable: true }, { name: "b" }] })]);

      expect(items.map((i) => i.unpriceable)).toEqual([true, undefined]); // key absent when false
    });
  });

  describe("unique rows", () => {
    it("prices a unique off its base row's forms, the 5-chaos form as the take and the 80-chaos form as the check", () => {
      const rows = [base([listing("A", 5), listing("B", 80)]), uniqueRow()];

      const items = itemsOf(rows);

      expect(items[1]?.prices).toEqual({ take: 5, check: 80 }); // joined on base type and path
    });

    it("leaves low-confidence forms out of the list", () => {
      const rows = [base([listing("A", 5), listing("B", 80, false, true)]), uniqueRow()];

      const items = itemsOf(rows);

      expect(items[1]?.prices).toEqual({ take: 5 });
    });

    it("adds a gamble from a corrupted form on the same base", () => {
      const rows = [base([listing("A", 5), listing("A", 300, true)]), uniqueRow()];

      const items = itemsOf(rows);

      expect(items[1]?.prices).toEqual({ take: 5, gamble: 300 }); // corrupted forms become outcomes
    });

    it("prices a corrupted unique off the corrupted forms only, as a check", () => {
      const rows = [base([listing("A", 5), listing("A", 300, true)]), uniqueRow({ conditions: [{ condition: "Corrupted", value: true }] })];

      const items = itemsOf(rows);

      expect(items[1]?.prices).toEqual({ check: 300 }); // clean 5-chaos form ignored
    });

    it("falls back to the unique row's own price when no base carries a usable form", () => {
      const items = itemsOf([uniqueRow({ meanPrice: 12 })]);

      expect(items[0]?.prices).toEqual({ take: 12 });
    });

    it("reads a foulborn unique's forms off the base's foulborn group", () => {
      const rows = [base([listing("F", 40)], "foulborn"), uniqueRow({ category: "foulborn", subcategory: null })];

      const items = itemsOf(rows);

      expect(items[1]?.prices).toEqual({ take: 40 }); // category decides the path
    });

    it("finds no forms for a unique row with no subcategory outside foulborn, so its own price is used", () => {
      const rows = [base([listing("A", 5)]), uniqueRow({ subcategory: null, meanPrice: 9 })];

      const items = itemsOf(rows);

      expect(items[1]?.prices).toEqual({ take: 9 }); // null path, no lookup
    });

    it("files a unique-rarity variant of a non-unique row under unique, priced off the regular forms", () => {
      const row: CatalogRow = {
        key: "jewel",
        name: "Cobalt Jewel",
        category: "jewels",
        subcategory: "base",
        baseTypes: ["Glorious Plate"],
        variants: [{ name: "unique", conditions: [{ condition: "Rarity", operator: "==", value: ["Unique"] }] }],
      };

      const items = itemsOf([base([listing("A", 5)]), row]);

      expect([items[1]?.category, items[1]?.prices]).toEqual(["unique", { take: 5 }]); // a stray unique
    });
  });
});
