import { describe, it, expect } from "@jest/globals";
import { missingListings } from "./missing-listings.ts";
import { ggg } from "../test-helpers.ts";

describe("missingListings", () => {
  it("names an item with no variants and no listing", () => { // the plain case the save guard catches
    expect(missingListings([ggg("a")])).toEqual(["a"]);
  });

  it("does not name an item that has a listing", () => { // one listing is enough
    expect(missingListings([ggg("a", { listing: { name: "a" } })])).toEqual([]);
  });

  it("treats an empty list of listings as no listing", () => { // [] counts as unlisted
    expect(missingListings([ggg("a", { listing: [] })])).toEqual(["a"]);
  });

  it("names each unlisted variant, not the item that holds them", () => { // with variants the item's own listing is not asked for
    const item = ggg("a", {
      variants: [
        { name: "v1", conditions: [], listing: { name: "x" } },
        { name: "v2", conditions: [] },
      ],
    });

    expect(missingListings([item])).toEqual(["a / v2"]);
  });

  it("skips an unlisted variant that is itself flagged unpriceable", () => { // the variant flag, not the item's
    const item = ggg("a", { variants: [{ name: "v", conditions: [], unpriceable: true }] });

    expect(missingListings([item])).toEqual([]);
  });

  it("skips excluded, quest and unpriceable items", () => { // none of these are priced
    const items = [ggg("a", { excluded: true }), ggg("b", { quest: true }), ggg("c", { unpriceable: true })];

    expect(missingListings(items)).toEqual([]);
  });

  it("skips the variants of an excluded item too", () => { // the item filter runs before its variants are read
    const item = ggg("a", { excluded: true, variants: [{ name: "v", conditions: [] }] });

    expect(missingListings([item])).toEqual([]);
  });
});
