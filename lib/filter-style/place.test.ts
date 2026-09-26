import { describe, it, expect } from "@jest/globals";
import { place } from "./place.ts";
import type { Item, PlaceOptions } from "./types.ts";

const floors = { T0: 500, T1: 100, T2: 20, T3: 5, T4: 2, T5: 1 };
const options = (extra: Partial<PlaceOptions> = {}): PlaceOptions => ({ floors, disabled: [], hints: [], wanted: [], ...extra });
const item = (name: string, prices: Item["prices"], extra: Partial<Item> = {}): Item => ({ name, key: name, category: "c", prices, ...extra });

describe("place", () => {
  describe("by price", () => {
    it("places a take price in the tier whose range holds it, as the winner", () => {
      const { placed } = place([item("a", { take: 20 })], options());

      expect(placed).toEqual([
        { item: item("a", { take: 20 }), bucket: "T2", verb: "take", reason: "worth it as it lies: 20c, inside 20-100c", won: true },
      ]);
    });

    it("places a price under the lowest floor in Hidden", () => {
      const { placed } = place([item("a", { take: 0.5 })], options());

      expect([placed[0]?.bucket, placed[0]?.reason]).toEqual(["Hidden", "worth it as it lies: 0.5c, inside under 1c"]);
    });

    it("leaves an item unplaced when nothing priced it", () => {
      const result = place([item("a", {})], options());

      expect([result.placed, result.unplaced]).toEqual([[], [{ item: item("a", {}), reason: "nothing priced it" }]]);
    });

    it("leaves an item with a negative price unplaced, since no bucket holds it", () => {
      expect(place([item("a", { take: -1 })], options()).unplaced).toHaveLength(1);
    });

    it("drops check and gamble prices in a category without those hints", () => {
      const { placed } = place([item("a", { take: 2, check: 600, gamble: 600 })], options());

      expect(placed.map((one) => one.verb)).toEqual(["take"]);
    });

    it("lets the richest qualification win when a hint reaches higher than the take", () => {
      const { placed } = place([item("a", { take: 2, check: 600 })], options({ hints: ["check"] }));

      expect(placed.map((one) => [one.bucket, one.verb, one.won])).toEqual([
        ["T4", "take", false],
        ["T0", "check", true],
      ]);
    });

    it("prefers take over check when both land in the same tier", () => {
      const { placed } = place([item("a", { take: 30, check: 40 })], options({ hints: ["check"] }));

      expect(placed.filter((one) => one.won).map((one) => one.verb)).toEqual(["take"]);
    });

    it("gives a disabled tier's prices to the tier below", () => {
      const { placed } = place([item("a", { take: 200 })], options({ disabled: ["T1"] }));

      expect(placed[0]?.bucket).toBe("T2");
    });

    it("puts a wanted item in Want to see with its first known verb, whatever it is worth", () => {
      const { placed } = place([item("a", { check: 1 })], options({ hints: ["check"], wanted: ["a"] }));

      expect([placed[0]?.bucket, placed[0]?.verb, placed[0]?.won]).toEqual(["Want to see", "check", true]);
    });

    it("gives a wanted item with no allowed price the take verb", () => {
      const { placed } = place([item("a", { check: 1 })], options({ wanted: ["a"] }));

      expect(placed[0]?.verb).toBe("take");
    });

    it("puts an unpriceable item in Unpriced even when it has a price", () => {
      const { placed } = place([item("a", { take: 999 }, { unpriceable: true })], options());

      expect([placed[0]?.bucket, placed[0]?.reason]).toEqual(["Unpriced", "flagged unpriceable in the taxonomy"]);
    });

    it("lets the want-to-see list beat the unpriceable flag", () => {
      const { placed } = place([item("a", {}, { unpriceable: true })], options({ wanted: ["a"] }));

      expect(placed[0]?.bucket).toBe("Want to see");
    });
  });

  describe("by stack size", () => {
    it("gives an item one winning block per bucket, each with its stack range", () => {
      const { placed, unplaced } = place([item("a", {})], options({ tiering: "stack-size", disabled: ["T2", "T3", "T4", "T5"] }));

      expect([unplaced, placed.map((one) => [one.bucket, one.stack, one.reason, one.won])]).toEqual([
        [],
        [
          ["T0", { floor: 500 }, "a stack of 500 and up", true],
          ["T1", { floor: 100, ceiling: 500 }, "a stack of 100-500", true],
          ["Hidden", { floor: 0, ceiling: 100 }, "a stack of under 100", true],
        ],
      ]);
    });

    it("still sends a wanted item to Want to see alone", () => {
      const { placed } = place([item("a", {})], options({ tiering: "stack-size", wanted: ["a"] }));

      expect(placed.map((one) => one.bucket)).toEqual(["Want to see"]);
    });

    it("still sends an unpriceable item to Unpriced alone", () => {
      const { placed } = place([item("a", {}, { unpriceable: true })], options({ tiering: "stack-size" }));

      expect(placed.map((one) => one.bucket)).toEqual(["Unpriced"]);
    });

    it("drops hint prices the category has no hint for, as price mode does", () => {
      const { placed } = place([item("a", { check: 5 })], options({ tiering: "stack-size", wanted: ["a"] }));

      expect(placed[0]?.verb).toBe("take");
    });
  });
});
