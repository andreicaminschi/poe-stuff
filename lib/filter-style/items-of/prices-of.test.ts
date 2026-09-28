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
  describe("with a single price", () => {
    it("has no prices when nothing priced it", () => {
      expect(pricesOf({ unique: false, corrupted: false })).toEqual({});
    });

    it("makes a normal item's price a take", () => {
      expect(pricesOf({ price: 5, unique: false, corrupted: true })).toEqual({ take: 5 });
    });

    it("makes a corrupted unique's price a check, never a take", () => {
      expect(pricesOf({ price: 5, unique: true, corrupted: true })).toEqual({ check: 5 });
    });

    it("keeps a price of zero as a take", () => {
      expect(pricesOf({ price: 0, unique: true, corrupted: false })).toEqual({ take: 0 });
    });
  });

  describe("with a list of forms", () => {
    it("takes at the cheapest form and checks at the dearest", () => {
      expect(pricesOf({ list: [one(3), one(40)], unique: true, corrupted: false })).toEqual({ take: 3, check: 40 });
    });

    it("drops the check when every form costs the same", () => {
      expect(pricesOf({ list: [one(7), one(7)], unique: true, corrupted: false })).toEqual({ take: 7 });
    });

    it("ignores the single price once a list is given", () => {
      expect(pricesOf({ price: 1000, list: [one(2)], unique: true, corrupted: false })).toEqual({ take: 2 });
    });

    it("counts a form without a price as zero", () => {
      expect(pricesOf({ list: [one(undefined), one(8)], unique: true, corrupted: false })).toEqual({
        take: 0,
        check: 8,
      });
    });

    it("gives a corrupted list only a check at its dearest form", () => {
      expect(pricesOf({ list: [one(3), one(40)], unique: true, corrupted: true })).toEqual({ check: 40 });
    });

    it("gives an empty list no prices", () => {
      expect(pricesOf({ list: [], unique: true, corrupted: false })).toEqual({});
    });
  });

  describe("with corruption outcomes", () => {
    it("adds a gamble at the best outcome when it beats the take", () => {
      const prices = pricesOf({
        list: [one(3)],
        outcomes: [one(1, true), one(50, true)],
        unique: true,
        corrupted: false,
      });

      expect(prices).toEqual({ take: 3, gamble: 50 });
    });

    it("adds no gamble when the best outcome only equals the take", () => {
      const prices = pricesOf({ list: [one(3)], outcomes: [one(3, true)], unique: true, corrupted: false });

      expect(prices).toEqual({ take: 3 });
    });

    it("reads no outcomes when there is no list", () => {
      expect(pricesOf({ price: 3, outcomes: [one(50, true)], unique: true, corrupted: false })).toEqual({ take: 3 });
    });

    it("reads no outcomes for a corrupted item", () => {
      const prices = pricesOf({ list: [one(3)], outcomes: [one(50, true)], unique: true, corrupted: true });

      expect(prices).toEqual({ check: 3 });
    });
  });
});
