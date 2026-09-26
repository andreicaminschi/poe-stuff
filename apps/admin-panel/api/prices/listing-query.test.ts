import { describe, expect, it } from "@jest/globals";
import { listingQuery } from "./listing-query.ts";
import { icon, listing } from "./prices.test-helpers.ts";

describe("listingQuery", () => {
  it("finds a plain listing by name and frame alone", () => {
    expect(listingQuery(listing({}))).toEqual({ name: "Tabula Rasa", frame: 3, synthesised: false });
  });

  it("keeps every distinguishing field that is set, including zero and false, and drops null ones", () => {
    const query = listingQuery(
      listing({ gemLevel: 0, gemQuality: 20, gemIsCorrupted: false, linkCount: null, itemLevel: 86, mapTier: undefined }),
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
  });

  it("keeps the influences as the comma-joined string PoeWatch sends", () => {
    expect(listingQuery(listing({ influences: "shaper,elder" })).influences).toBe("shaper,elder");
  });

  it("reads synthesis out of the icon's encoded settings", () => {
    expect(listingQuery(listing({ icon: icon({ f: "x", synthesised: true }) })).synthesised).toBe(true);
    expect(listingQuery(listing({ icon: icon({ f: "x", synthesised: false }) })).synthesised).toBe(false);
  });

  it("ignores fields outside the known list, such as the price", () => {
    expect(listingQuery(listing({ mean: 5, corrupted: true }))).not.toHaveProperty("mean");
  });
});
