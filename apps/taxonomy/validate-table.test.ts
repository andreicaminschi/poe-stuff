import { describe, expect, it } from "@jest/globals";
import { collectTaxonomyTable, listingProblem, validateTaxonomyTable } from "./validate-table.ts";

const entry = (extra: Record<string, unknown> = {}) => ({
  name: "Ruby Ring",
  category: "rings",
  subcategory: null,
  ...extra,
});

const problemOf = (value: unknown) => collectTaxonomyTable({ Ring: value }, "items")[0]?.problem;

describe("listingProblem", () => {
  it("accepts one query with correctly typed fields", () => {
    expect(listingProblem({ name: "Ruby Ring", gemLevel: 20, gemIsCorrupted: true })).toBeNull();
  });

  it("accepts a list of queries", () => {
    expect(listingProblem([{ name: "A" }, { name: "B" }])).toBeNull();
  });

  it("refuses an empty list", () => {
    expect(listingProblem([])).toBe("listing is an empty list");
  });

  it("refuses a query with no fields", () => {
    expect(listingProblem({})).toBe("listing matches nothing");
  });

  it("reports the first bad query in a list", () => {
    expect(listingProblem([{ name: "A" }, "B"])).toBe("listing is not an object");
  });

  it("refuses a field PoeWatch does not know", () => {
    expect(listingProblem({ price: 1 })).toBe("listing has unknown field: price");
  });

  it("refuses a number written as text", () => {
    expect(listingProblem({ gemLevel: "20" })).toBe("listing.gemLevel must be a number");
  });
});

describe("collectTaxonomyTable", () => {
  it("accepts a minimal entry", () => {
    expect(problemOf(entry())).toBeUndefined();
  });

  it("accepts any key, since items are keyed by metadata id", () => {
    expect(collectTaxonomyTable({ "Metadata/Items/Rings/Ring1": entry() }, "items")).toEqual([]);
  });

  it("names every unknown field", () => {
    expect(problemOf(entry({ baseType: "x" }))).toBe("has unknown fields: baseType");
  });

  it("refuses an empty display name", () => {
    expect(problemOf(entry({ displayName: "" }))).toBe("displayName must be a non-empty string when it is present");
  });

  it("refuses a missing subcategory", () => {
    expect(problemOf({ name: "Ruby Ring", category: "rings" })).toBe("subcategory must be a non-empty string or null");
  });

  it.each(["filterable", "tradable", "tradedOnExchange", "excluded", "quest", "unpriceable"])(
    "refuses a %s flag that is not a boolean",
    (flag) => {
      expect(problemOf(entry({ [flag]: 1 }))).toBe(`${flag} must be a boolean when it is present`);
    },
  );

  it("passes on a conditions problem", () => {
    expect(problemOf(entry({ conditions: [{ condition: "Class" }] }))).toBe("Class has neither value nor from");
  });

  it("passes on a listing problem", () => {
    expect(problemOf(entry({ listing: [] }))).toBe("listing is an empty list");
  });
});

describe("validateTaxonomyTable", () => {
  it("throws the first problem with its source", () => {
    expect(() => validateTaxonomyTable({ Ring: "x" }, "items")).toThrow("items: \"Ring\" is not an object");
  });
});
