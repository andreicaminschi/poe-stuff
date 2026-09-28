import { describe, it, expect } from "@jest/globals";
import { place } from "./place.ts";
import type { Item, PlaceOptions } from "./types.ts";

const floors = { T0: 500, T1: 100, T2: 20, T3: 5, T4: 2, T5: 1 };
const options = (extra: Partial<PlaceOptions> = {}): PlaceOptions => ({
  floors,
  disabled: [],
  hints: [],
  wanted: [],
  ...extra,
});
const item = (name: string, prices: Item["prices"], extra: Partial<Item> = {}): Item => ({
  name,
  key: name,
  category: "c",
  prices,
  ...extra,
});

describe("place", () => {
  describe("by price", () => {
    it("puts an item worth exactly 20 chaos in T2 as the winning block, with a reason naming the range", () => {
      const { placed } = place([item("a", { take: 20 })], options());

      expect(placed).toEqual([
        { item: item("a", { take: 20 }), bucket: "T2", verb: "take", reason: "worth it as it lies: 20c, inside 20-100c", won: true },
      ]); // at the floor, not the tier below
    });

    it("puts an item worth half a chaos in Hidden", () => {
      const { placed } = place([item("a", { take: 0.5 })], options());

      expect([placed[0]?.bucket, placed[0]?.reason]).toEqual(["Hidden", "worth it as it lies: 0.5c, inside under 1c"]);
    });

    it("leaves an item nothing priced unplaced, saying so", () => {
      const result = place([item("a", {})], options());

      expect([result.placed, result.unplaced]).toEqual([[], [{ item: item("a", {}), reason: "nothing priced it" }]]);
    });

    it("leaves an item with a negative price unplaced, since even Hidden starts at zero", () => {
      const result = place([item("a", { take: -1 })], options());

      expect(result.unplaced.map((one) => one.reason)).toEqual(["nothing priced it"]);
    });

    it("ignores check and gamble prices in a category that has neither hint", () => {
      const { placed } = place([item("a", { take: 2, check: 600, gamble: 600 })], options());

      expect(placed.map((one) => one.verb)).toEqual(["take"]); // stripped before placing
    });

    it("lets a 600-chaos check beat a 2-chaos take, listing both but crowning the check", () => {
      const { placed } = place([item("a", { take: 2, check: 600 })], options({ hints: ["check"] }));

      expect(placed.map((one) => [one.bucket, one.verb, one.won])).toEqual([
        ["T4", "take", false],
        ["T0", "check", true],
      ]); // richest bucket wins
    });

    it("explains a gamble placement as what corrupting it could reach", () => {
      const { placed } = place([item("a", { gamble: 150 })], options({ hints: ["gamble"] }));

      expect(placed[0]?.reason).toBe("corrupting it could reach it: 150c, inside 100-500c");
    });

    it("crowns the take over the check when both land in the same tier", () => {
      const { placed } = place([item("a", { take: 30, check: 40 })], options({ hints: ["check"] }));

      expect(placed.filter((one) => one.won).map((one) => one.verb)).toEqual(["take"]); // tie broken by verb order
    });

    it("puts a 200-chaos item in T2 when T1 is disabled", () => {
      const { placed } = place([item("a", { take: 200 })], options({ disabled: ["T1"] }));

      expect(placed[0]?.bucket).toBe("T2"); // T2's ceiling rises to 500
    });

    it("puts a wanted item in Want to see with its first priced verb, whatever it is worth", () => {
      const { placed } = place([item("a", { check: 1 })], options({ hints: ["check"], wanted: ["a"] }));

      expect([placed[0]?.bucket, placed[0]?.verb, placed[0]?.won]).toEqual(["Want to see", "check", true]);
    });

    it("gives a wanted item the take verb when its only price is a hint the category does not have", () => {
      const { placed } = place([item("a", { check: 1 })], options({ wanted: ["a"] }));

      expect(placed[0]?.verb).toBe("take"); // check stripped, fallback verb
    });

    it("puts an unpriceable item in Unpriced even when it has a 999-chaos price", () => {
      const { placed } = place([item("a", { take: 999 }, { unpriceable: true })], options());

      expect([placed[0]?.bucket, placed[0]?.reason]).toEqual(["Unpriced", "flagged unpriceable in the taxonomy"]);
    });

    it("lets the want-to-see list beat the unpriceable flag", () => {
      const { placed } = place([item("a", {}, { unpriceable: true })], options({ wanted: ["a"] }));

      expect(placed[0]?.bucket).toBe("Want to see"); // want checked first
    });
  });

  describe("by stack size", () => {
    it("gives an item one winning block per bucket, each carrying its stack range", () => {
      const { placed, unplaced } = place([item("a", {})], options({ tiering: "stack-size", disabled: ["T2", "T3", "T4", "T5"] }));

      expect([unplaced, placed.map((one) => [one.bucket, one.stack, one.reason, one.won])]).toEqual([
        [],
        [
          ["T0", { floor: 500 }, "a stack of 500 and up", true],
          ["T1", { floor: 100, ceiling: 500 }, "a stack of 100-500", true],
          ["Hidden", { floor: 0, ceiling: 100 }, "a stack of under 100", true],
        ],
      ]); // price is never read, so nothing is unplaced
    });

    it("still sends a wanted item to Want to see and nowhere else", () => {
      const { placed } = place([item("a", {})], options({ tiering: "stack-size", wanted: ["a"] }));

      expect(placed.map((one) => one.bucket)).toEqual(["Want to see"]);
    });

    it("still sends an unpriceable item to Unpriced and nowhere else", () => {
      const { placed } = place([item("a", {}, { unpriceable: true })], options({ tiering: "stack-size" }));

      expect(placed.map((one) => one.bucket)).toEqual(["Unpriced"]);
    });

    it("strips a check price the category has no hint for, just as pricing by chaos does", () => {
      const { placed } = place([item("a", { check: 5 })], options({ tiering: "stack-size", wanted: ["a"] }));

      expect(placed[0]?.verb).toBe("take");
    });
  });
});
