import { describe, expect, it } from "@jest/globals";
import { listingQuery } from "./listing-query.ts";
import { icon, listing } from "./prices.test-helpers.ts";

describe("listingQuery", () => {
  it("finds a plain listing by name and frame alone", () => {
    const query = listingQuery(listing({}));

    expect(query).toEqual({ name: "Tabula Rasa", frame: 3, synthesised: false });
  }); // synthesised is always present, even when false

  it("keeps a distinguishing field set to zero or false, and drops one that is null or missing", () => {
    const query = listingQuery(
      listing({
        gemLevel: 0,
        gemQuality: 20,
        gemIsCorrupted: false,
        linkCount: null,
        itemLevel: 86,
        mapTier: undefined,
      }),
    );

    expect(query).toEqual({
      name: "Tabula Rasa",
      frame: 3,
      gemLevel: 0,
      gemQuality: 20,
      gemIsCorrupted: false,
      itemLevel: 86,
      synthesised: false,
    });
  }); // a truthiness check would lose level 0 and false

  it("keeps the influences as the comma-joined string PoeWatch sends", () => {
    const query = listingQuery(listing({ influences: "shaper,elder" }));

    expect(query.influences).toBe("shaper,elder");
  }); // not split: the query must match PoeWatch verbatim

  it("leaves influences out when the listing has none", () => {
    const query = listingQuery(listing({ influences: "" }));

    expect(query).not.toHaveProperty("influences");
  }); // PoeWatch sends "" for none

  it("marks a listing synthesised when its icon's encoded settings say so", () => {
    const query = listingQuery(listing({ icon: icon({ f: "x", synthesised: true }) }));

    expect(query.synthesised).toBe(true);
  }); // synthesis is only in the base64url icon segment

  it("does not mark a listing synthesised when its icon's settings say false", () => {
    const query = listingQuery(listing({ icon: icon({ f: "x", synthesised: false }) }));

    expect(query.synthesised).toBe(false);
  });

  it("does not mark a listing synthesised when its icon has no encoded settings at all", () => {
    const query = listingQuery(listing({ icon: "https://web.poecdn.com/Item.png" }));

    expect(query.synthesised).toBe(false);
  }); // no /image/ segment must not throw

  it("ignores fields outside the known list, such as the price", () => {
    const query = listingQuery(listing({ mean: 5, corrupted: true }));

    expect(query).not.toHaveProperty("mean");
    expect(query).not.toHaveProperty("corrupted");
  });
});
