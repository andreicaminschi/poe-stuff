import { describe, it, expect } from "@jest/globals";
import { listKey, priceLists } from "./price-lists.ts";
import type { CatalogRow } from "../types.ts";

const row = (baseTypes: string[], uniques: CatalogRow["uniques"]): CatalogRow => ({
  key: baseTypes.join(","),
  name: baseTypes[0] ?? "",
  category: "armour",
  subcategory: null,
  baseTypes,
  ...(uniques === undefined
    ? {}
    : { uniques }),
});

const listing = { name: "Kaom's Heart", meanPrice: 10, corrupted: false };

describe("priceLists", () => {
  it("files a unique group with no subcategory under the regular path", () => {
    const rows = [row(["Glorious Plate"], [{ category: "unique", subcategory: null, listings: [listing] }])];

    const lists = priceLists(rows);

    expect(lists.get(listKey("Glorious Plate", "regular"))).toEqual([listing]); // null falls back to "regular"
  });

  it("files a foulborn group under the foulborn path", () => {
    const rows = [row(["Glorious Plate"], [{ category: "unique", subcategory: "foulborn", listings: [listing] }])];

    const lists = priceLists(rows);

    expect([...lists.keys()]).toEqual(["Glorious Plate|foulborn"]);
  });

  it("files the same list under each of a row's two base types", () => {
    const rows = [row(["A", "B"], [{ category: "unique", subcategory: null, listings: [listing] }])];

    const lists = priceLists(rows);

    expect([...lists.keys()]).toEqual(["A|regular", "B|regular"]);
  });

  it("joins two rows' lists on the same base and path, earlier row first", () => {
    const later = { ...listing, meanPrice: 99 };
    const rows = [
      row(["A"], [{ category: "unique", subcategory: null, listings: [listing] }]),
      row(["A"], [{ category: "unique", subcategory: null, listings: [later] }]),
    ];

    const lists = priceLists(rows);

    expect(lists.get("A|regular")).toEqual([listing, later]); // appended, not replaced
  });

  it("files nothing for a row with no uniques", () => {
    const lists = priceLists([row(["A"], undefined)]);

    expect(lists.size).toBe(0);
  });
});
