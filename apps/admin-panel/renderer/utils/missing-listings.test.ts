import { describe, it, expect } from "@jest/globals";
import type { Item } from "../../api/taxonomy/types.ts";
import { missingListings } from "./missing-listings.ts";

const item = (overrides: Partial<Item>): Item =>
  ({
    source: "ggg",
    key: "k",
    name: "Ghastly Eye Jewel",
    classification: { category: "jewels", subcategory: null },
    conditions: [],
    variants: [],
    ...overrides,
  }) as Item;

describe("missingListings", () => {
  it("names an item with no listing", () => {
    expect(missingListings([item({})])).toEqual(["Ghastly Eye Jewel"]);
  });

  it("names each variant with no listing, beside a listed item", () => {
    expect(
      missingListings([
        item({
          listing: { name: "Ghastly Eye Jewel" },
          variants: [
            { name: "ilvl 86", conditions: [], listing: { itemLevel: 86 } },
            { name: "ilvl 83", conditions: [] },
          ],
        }),
      ]),
    ).toEqual(["Ghastly Eye Jewel / ilvl 83"]);
  });

  it("is empty when everything is listed", () => {
    expect(missingListings([item({ listing: { name: "Chaos Orb" } })])).toEqual([]);
  });
});
