import { describe, expect, it } from "@jest/globals";
import { bucketItems } from "./bucket-items.ts";
import type { Bucket, PricedRow } from "./bucket-items/types.ts";

const LADDER: readonly Bucket[] = [
  { name: "T5", floor: 1, ceiling: 10, gamble: true },
  { name: "T3", floor: 20, ceiling: 30, gamble: true },
  { name: "T0", floor: 50, gamble: false },
];

const CORRUPTED = [{ condition: "Corrupted", value: true }];

const rowWith = (name: string, fields: Partial<PricedRow>): PricedRow => ({
  key: `authored/${name}`,
  name,
  category: "unique",
  subcategory: "regular",
  ...fields,
});

describe("bucketItems", () => {
  it("refuses to run without a single bucket", () => {
    expect(() => bucketItems([], [rowWith("Heavy Belt", { meanPrice: 5 })])).toThrow(
      "needs at least one bucket",
    );
  });

  it("returns nothing placed and nothing unplaced for an empty catalog", () => {
    expect(bucketItems(LADDER, [])).toEqual({ placed: [], unplaced: [] });
  });

  describe("rows no bucket wanted", () => {
    it("returns them rather than dropping them", () => {
      const rows = [
        rowWith("Heavy Belt", { meanPrice: 5 }),
        rowWith("Copper Sword", { meanPrice: 15 }),
      ];

      const { placed, unplaced } = bucketItems(LADDER, rows);

      expect(placed.map((one) => one.name)).toEqual(["Heavy Belt"]);
      expect(unplaced.map((one) => one.name)).toEqual(["Copper Sword"]);
    });

    it("says so when nothing priced the row at all", () => {
      const { unplaced } = bucketItems(LADDER, [rowWith("Coronal Maul Uniques", {})]);

      expect(unplaced[0]?.reason).toBe("nothing priced it");
    });

    it("says so when the row is worth less than the cheapest bucket wants", () => {
      const { unplaced } = bucketItems(LADDER, [rowWith("Alone in the Darkness", { meanPrice: 0.5 })]);

      expect(unplaced[0]?.reason).toBe("worth 0.5c at best, under the 1c floor of every bucket");
    });

    it("says so when the row's price falls in a hole between two buckets", () => {
      const { unplaced } = bucketItems(LADDER, [rowWith("Colosseum Plate", { meanPrice: 14 })]);

      expect(unplaced[0]?.reason).toBe("worth 14c at best, which falls in a gap between buckets");
    });

    it("says so when only its corruption reaches a bucket and none there gambles", () => {
      const row = rowWith("Citrine Amulet Uniques", {
        variants: [
          { name: "normal", meanPrice: 0.5 },
          { name: "corrupted", meanPrice: 60, conditions: CORRUPTED },
        ],
      });

      const { unplaced } = bucketItems(LADDER, [row]);

      expect(unplaced[0]?.reason).toBe(
        "only its 60c corruption reaches a bucket, and no bucket there gambles",
      );
    });
  });

  it("carries the prices it derived onto every row it places", () => {
    const row = rowWith("Bastard Sword Uniques", {
      variants: [
        { name: "normal", meanPrice: 1 },
        { name: "corrupted", meanPrice: 25, conditions: CORRUPTED },
      ],
    });

    const { placed } = bucketItems(LADDER, [row]);

    expect(placed[0]?.prices).toEqual({ take: 1, check: 1, gamble: 25 });
    expect(placed[0]?.bucket).toBe("T3");
    expect(placed[0]?.verb).toBe("gamble");
  });
});
