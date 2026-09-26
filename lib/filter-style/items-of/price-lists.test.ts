import { describe, it, expect } from "@jest/globals";
import { listKey, priceLists } from "./price-lists.ts";
import type { CatalogRow } from "../types.ts";

const row = (baseTypes: string[], uniques: CatalogRow["uniques"]): CatalogRow => ({
  key: baseTypes.join(","),
  name: baseTypes[0] ?? "",
  category: "armour",
  subcategory: null,
  baseTypes,
  ...(uniques === undefined ? {} : { uniques }),
});

const listing = { name: "Kaom's Heart", meanPrice: 10, corrupted: false };

describe("priceLists", () => {
  it("files a group with no subcategory under the regular path", () => {
    const lists = priceLists([row(["Glorious Plate"], [{ category: "unique", subcategory: null, listings: [listing] }])]);

    expect(lists.get(listKey("Glorious Plate", "regular"))).toEqual([listing]);
  });

  it("files a group under its subcategory as the path", () => {
    const lists = priceLists([row(["Glorious Plate"], [{ category: "unique", subcategory: "foulborn", listings: [listing] }])]);

    expect([...lists.keys()]).toEqual(["Glorious Plate|foulborn"]);
  });

  it("files the same list under every base type the row carries", () => {
    const lists = priceLists([row(["A", "B"], [{ category: "unique", subcategory: null, listings: [listing] }])]);

    expect([...lists.keys()]).toEqual(["A|regular", "B|regular"]);
  });

  it("merges two rows' lists on the same base and path", () => {
    const later = { ...listing, meanPrice: 99 };

    const lists = priceLists([
      row(["A"], [{ category: "unique", subcategory: null, listings: [listing] }]),
      row(["A"], [{ category: "unique", subcategory: null, listings: [later] }]),
    ]);

    expect(lists.get("A|regular")).toEqual([listing, later]);
  });

  it("returns an empty map for rows without uniques", () => {
    expect(priceLists([row(["A"], undefined)]).size).toBe(0);
  });
});
