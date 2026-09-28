import { describe, it, expect } from "@jest/globals";
import { pricesOf } from "./prices-of.ts";

const one = (meanPrice: number | undefined, corrupted = false) => ({
  name: "x",
  corrupted,
  ...(meanPrice === undefined
    ? {}
    : { meanPrice }),
});

describe("pricesOf", () => {
  describe("an item with one price", () => {
    it("has no prices when nothing priced it", () => {
      const prices = pricesOf({ unique: false, corrupted: false });

      expect(prices).toEqual({});
    });

    it("makes a corrupted item that is not unique a take at its price", () => {
      const prices = pricesOf({ price: 5, unique: false, corrupted: true });

      expect(prices).toEqual({ take: 5 }); // only uniques lose the take
    });

    it("makes a corrupted unique a check at its price, never a take", () => {
      const prices = pricesOf({ price: 5, unique: true, corrupted: true });

      expect(prices).toEqual({ check: 5 }); // worth rides on an implicit no condition reads
    });

    it("keeps a price of zero as a take", () => {
      const prices = pricesOf({ price: 0, unique: true, corrupted: false });

      expect(prices).toEqual({ take: 0 }); // zero is a price, not a missing one
    });
  });

  describe("a unique with a list of forms", () => {
    it("takes at the cheapest form, 3 chaos, and checks at the dearest, 40 chaos", () => {
      const prices = pricesOf({ list: [one(3), one(40)], unique: true, corrupted: false });

      expect(prices).toEqual({ take: 3, check: 40 });
    });

    it("gives no check when every form costs the same", () => {
      const prices = pricesOf({ list: [one(7), one(7)], unique: true, corrupted: false });

      expect(prices).toEqual({ take: 7 }); // check only when strictly dearer
    });

    it("ignores the single price once a list is given", () => {
      const prices = pricesOf({ price: 1000, list: [one(2)], unique: true, corrupted: false });

      expect(prices).toEqual({ take: 2 }); // list wins
    });

    it("counts a form with no price as free", () => {
      const prices = pricesOf({ list: [one(undefined), one(8)], unique: true, corrupted: false });

      expect(prices).toEqual({ take: 0, check: 8 });
    });

    it("gives a corrupted unique only a check at its dearest form", () => {
      const prices = pricesOf({ list: [one(3), one(40)], unique: true, corrupted: true });

      expect(prices).toEqual({ check: 40 });
    });

    it("gives an empty list no prices", () => {
      const prices = pricesOf({ list: [], unique: true, corrupted: false });

      expect(prices).toEqual({}); // Math.min() of nothing would be Infinity
    });
  });

  describe("an uncorrupted unique with corruption outcomes", () => {
    it("adds a gamble at the best outcome, 50 chaos, when it beats the 3-chaos take", () => {
      const worth = { list: [one(3)], outcomes: [one(1, true), one(50, true)], unique: true, corrupted: false };

      const prices = pricesOf(worth);

      expect(prices).toEqual({ take: 3, gamble: 50 });
    });

    it("adds no gamble when the best outcome only equals the take", () => {
      const worth = { list: [one(3)], outcomes: [one(3, true)], unique: true, corrupted: false };

      const prices = pricesOf(worth);

      expect(prices).toEqual({ take: 3 }); // strictly greater
    });

    it("adds no gamble when the outcome list is empty", () => {
      const worth = { list: [one(3)], outcomes: [], unique: true, corrupted: false };

      const prices = pricesOf(worth);

      expect(prices).toEqual({ take: 3 }); // Math.max() of nothing is -Infinity
    });

    it("reads no outcomes when the item has a single price rather than a list", () => {
      const prices = pricesOf({ price: 3, outcomes: [one(50, true)], unique: true, corrupted: false });

      expect(prices).toEqual({ take: 3 }); // outcomes only read in the list path
    });

    it("reads no outcomes for an item already corrupted", () => {
      const worth = { list: [one(3)], outcomes: [one(50, true)], unique: true, corrupted: true };

      const prices = pricesOf(worth);

      expect(prices).toEqual({ check: 3 });
    });
  });
});
