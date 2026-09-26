import { describe, it, expect } from "@jest/globals";
import { missingListings } from "./missing-listings.ts";
import { ggg } from "../test-helpers.ts";

describe("missingListings", () => {
  it("names an item with no variants and no listing", () => {
    expect(missingListings([ggg("a")])).toEqual(["a"]);
  });

  it("does not name an item that has a listing", () => {
    expect(missingListings([ggg("a", { listing: { name: "a" } })])).toEqual([]);
  });

  it("treats an empty list of listings as no listing", () => {
    expect(missingListings([ggg("a", { listing: [] })])).toEqual(["a"]);
  });

  it("names each unlisted variant, not the item that holds them", () => {
    const item = ggg("a", {
      variants: [
        { name: "v1", conditions: [], listing: { name: "x" } },
        { name: "v2", conditions: [] },
      ],
    });

    expect(missingListings([item])).toEqual(["a / v2"]);
  });

  it("skips an unlisted variant that is itself flagged unpriceable", () => {
    const item = ggg("a", { variants: [{ name: "v", conditions: [], unpriceable: true }] });

    expect(missingListings([item])).toEqual([]);
  });

  it("skips excluded, quest and unpriceable items", () => {
    const items = [ggg("a", { excluded: true }), ggg("b", { quest: true }), ggg("c", { unpriceable: true })];

    expect(missingListings(items)).toEqual([]);
  });
});
