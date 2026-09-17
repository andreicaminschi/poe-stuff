import { describe, expect, it } from "@jest/globals";
import { place } from "./place.ts";
import type { Bucket } from "./types.ts";

const LADDER: readonly Bucket[] = [
  { name: "T5", floor: 1, ceiling: 10, gamble: true },
  { name: "T3", floor: 20, ceiling: 30, gamble: true },
  { name: "T0", floor: 50, gamble: false },
];

describe("place", () => {
  describe("choosing between buckets", () => {
    it("puts an item in the richest bucket any of its three prices reaches", () => {
      const found = place(LADDER, { take: 5, check: 60 });

      expect(found?.bucket.name).toBe("T0");
      expect(found?.verb).toBe("check");
    });

    it("reads buckets richest-first however the caller ordered them", () => {
      const cheapestFirst = [...LADDER];
      const richestFirst = [...LADDER].reverse();

      expect(place(cheapestFirst, { take: 5, check: 60 })?.bucket.name).toBe("T0");
      expect(place(richestFirst, { take: 5, check: 60 })?.bucket.name).toBe("T0");
    });

    it("puts an item priced exactly at a bucket's floor in that bucket", () => {
      expect(place(LADDER, { take: 20, check: 20 })?.bucket.name).toBe("T3");
    });

    it("puts an item priced exactly at a bucket's ceiling in the next one up", () => {
      const atCeiling = place(LADDER, { take: 10, check: 10 });
      const justUnder = place(LADDER, { take: 9, check: 9 });

      expect(justUnder?.bucket.name).toBe("T5");
      expect(atCeiling).toBeUndefined();
    });

    it("places nothing when no bucket's range holds any of the prices", () => {
      expect(place(LADDER, { take: 15, check: 15 })).toBeUndefined();
    });
  });

  describe("choosing between take, check and gamble", () => {
    it("prefers what the item is worth as it lies over what a form of it could reach", () => {
      const found = place(LADDER, { take: 3, check: 8 });

      expect(found?.verb).toBe("take");
      expect(found?.reason).toContain("3c as it lies");
    });

    it("falls back to the dearest form when the cheapest is below the bucket", () => {
      const found = place(LADDER, { take: 0.5, check: 5 });

      expect(found?.bucket.name).toBe("T5");
      expect(found?.verb).toBe("check");
    });

    it("falls back to the corruption price when neither other price reaches the bucket", () => {
      const found = place(LADDER, { take: 0.5, check: 0.5, gamble: 25 });

      expect(found?.bucket.name).toBe("T3");
      expect(found?.verb).toBe("gamble");
    });
  });

  describe("a bucket that refuses gambling", () => {
    it("never reads the corruption price, even when it would reach that bucket", () => {
      const found = place(LADDER, { take: 1, check: 1, gamble: 999 });

      expect(found?.bucket.name).toBe("T5");
      expect(found?.verb).toBe("take");
    });

    it("still lets a lower gambling bucket take the item", () => {
      const found = place(LADDER, { gamble: 25 });

      expect(found?.bucket.name).toBe("T3");
      expect(found?.verb).toBe("gamble");
    });
  });

  describe("the open-topped bucket", () => {
    it("takes an item worth far more than any other bucket's ceiling", () => {
      const found = place(LADDER, { take: 82203, check: 82203 });

      expect(found?.bucket.name).toBe("T0");
      expect(found?.verb).toBe("take");
    });
  });
});
