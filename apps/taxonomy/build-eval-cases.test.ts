import { describe, expect, it } from "@jest/globals";
import { buildEvalCases, type EvalRow } from "./build-eval-cases.ts";
import type { MarketEntry, UniqueGroup } from "./build-eval-cases/types.ts";

const byBaseType = [{ condition: "BaseType", operator: "==", from: "baseTypes" }];

const normalRings = {
  conditions: byBaseType,
  samples: [{ Class: { values: ["Rings"] }, BaseType: { from: "baseTypes" as const }, Rarity: { values: ["Normal"] } }],
};

const categories = {
  rings: { conditions: [{ condition: "Class", operator: "==", value: "Rings" }] },
  "rings/any": normalRings,
  "rings/other": normalRings,
};

const entry = (name: string, id = 1): MarketEntry => ({ source: "poeWatch:items", id, name });

const row = (key: string, base: string, subcategory = "any"): EvalRow => ({
  key,
  name: base,
  category: "rings",
  subcategory,
  baseTypes: [base],
  poeWatch: entry(key),
});

const normalRing = (base: string) => ({ Class: "Rings", BaseType: base, Rarity: "Normal" });

const uniqueCategories = (set: Record<string, { values: readonly (string | boolean)[] }>) => ({
  ...categories,
  "rings/any": {
    conditions: byBaseType,
    samples: [{ Class: { values: ["Rings"] }, BaseType: { from: "baseTypes" as const }, Rarity: { values: ["Unique"] }, ...set }],
  },
});

const uniqueBase = (uniques: readonly UniqueGroup[]): EvalRow => ({ ...row("Ruby Ring", "Ruby Ring"), uniques });

describe("buildEvalCases", () => {
  describe("the expected answer", () => {
    it("is the market entry of the row whose block takes the item", () => {
      const rows = [row("Ruby Ring", "Ruby Ring"), row("Gold Ring", "Gold Ring")];

      const { cases } = buildEvalCases(rows, categories);

      expect(cases).toEqual([
        { item: normalRing("Ruby Ring"), expected: [entry("Ruby Ring")] },
        { item: normalRing("Gold Ring"), expected: [entry("Gold Ring")] },
      ]);
    });

    it("is empty when no block takes the item", () => {
      const amulets = {
        ...categories,
        "rings/any": { conditions: byBaseType, samples: [{ Class: { values: ["Amulets"] }, BaseType: { from: "baseTypes" as const } }] },
      };

      const { cases } = buildEvalCases([row("Ruby Ring", "Ruby Ring")], amulets);

      expect(cases).toEqual([{ item: { Class: "Amulets", BaseType: "Ruby Ring" }, expected: [] }]);
    });

    it("is every unique listing on the item's base, not the base's own price", () => {
      const base = uniqueBase([
        { subcategory: null, listings: [
          { corrupted: false, poeWatch: entry("Ming's Heart", 2) },
          { corrupted: false, poeWatch: entry("Andvarius", 3) },
        ] },
      ]);

      const { cases } = buildEvalCases([base], uniqueCategories({ Corrupted: { values: [false] } }));

      expect(cases.map((one) => one.expected)).toEqual([[entry("Ming's Heart", 2), entry("Andvarius", 3)]]);
    });

    it("gives a corrupted unique only the corrupted listings", () => {
      const base = uniqueBase([
        { subcategory: null, listings: [
          { corrupted: false, poeWatch: entry("Ming's Heart", 2) },
          { corrupted: true, poeWatch: entry("Ming's Heart", 4) },
        ] },
      ]);

      const { cases } = buildEvalCases([base], uniqueCategories({ Corrupted: { values: [true] } }));

      expect(cases.map((one) => one.expected)).toEqual([[entry("Ming's Heart", 4)]]);
    });

    it("gives a foulborn unique only the foulborn group's listings", () => {
      const base = uniqueBase([
        { subcategory: null, listings: [{ corrupted: false, poeWatch: entry("Ming's Heart", 2) }] },
        { subcategory: "foulborn", listings: [{ corrupted: false, poeWatch: entry("Ming's Heart", 5) }] },
      ]);

      const { cases } = buildEvalCases([base], uniqueCategories({ Foulborn: { values: [true] } }));

      expect(cases.map((one) => one.expected)).toEqual([[entry("Ming's Heart", 5)]]);
    });
  });

  describe("which items become cases", () => {
    it("never turns a reject sample into a case", () => {
      const withReject = { ...categories, "rings/any": { ...normalRings, rejects: [{ Rarity: { values: ["Rare"] } }] } };

      const { cases } = buildEvalCases([row("Ruby Ring", "Ruby Ring")], withReject);

      expect(cases.map((one) => one.item)).toEqual([normalRing("Ruby Ring")]);
    });

    it("keeps one case for an item two rows both build, answered by the first row", () => {
      const rows = [row("Ruby Ring", "Ruby Ring"), row("Ruby Ring B", "Ruby Ring")];

      const { cases } = buildEvalCases(rows, categories);

      expect(cases).toEqual([{ item: normalRing("Ruby Ring"), expected: [entry("Ruby Ring")] }]);
    });
  });

  describe("overlaps", () => {
    it("reports an item built on two paths, naming both paths", () => {
      const rows = [row("Ruby Ring", "Ruby Ring"), row("Ruby Ring Other", "Ruby Ring", "other")];

      const { overlaps } = buildEvalCases(rows, categories);

      expect(overlaps).toEqual([
        { item: normalRing("Ruby Ring"), rows: ["Ruby Ring", "Ruby Ring Other"], paths: ["rings/any", "rings/other"] },
      ]);
    });

    it("reports an item built twice on one path, naming both rows", () => {
      const rows = [row("Ruby Ring", "Ruby Ring"), row("Ruby Ring B", "Ruby Ring")];

      const { overlaps } = buildEvalCases(rows, categories);

      expect(overlaps).toEqual([
        { item: normalRing("Ruby Ring"), rows: ["Ruby Ring", "Ruby Ring B"], paths: ["rings/any", "rings/any"] },
      ]);
    });

    it("reports nothing when every row builds different items", () => {
      const rows = [row("Ruby Ring", "Ruby Ring"), row("Gold Ring", "Gold Ring", "other")];

      const { overlaps } = buildEvalCases(rows, categories);

      expect(overlaps).toEqual([]);
    });
  });
});
