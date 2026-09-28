import { describe, expect, it } from "@jest/globals";
import { collectVariantTable, validateVariantTable } from "./validate-variants.ts";

const known = new Set(["Gem"]);
const variant = (extra: Record<string, unknown> = {}) => ({ name: "20/20", conditions: [], ...extra });
const problemOf = (value: unknown) => collectVariantTable({ Gem: value }, known, "variants")[0]?.problem;

describe("collectVariantTable", () => {
  it("accepts a list of named variants", () => {
    expect(problemOf([variant(), variant({ name: "21/20", listing: { gemLevel: 21 } })])).toBeUndefined();
  });

  it("refuses variants on a key the version does not have", () => {
    expect(collectVariantTable({ Ghost: [variant()] }, known, "variants")).toEqual([
      { key: "Ghost", problem: "is not an item or an authored row in this version" },
    ]);
  });

  it("refuses a value that is not a list", () => {
    expect(problemOf({})).toBe("is not a list");
  });

  it("refuses an empty list", () => {
    expect(problemOf([])).toBe("authors no variants; delete the key instead");
  });

  it("refuses a variant that is not an object", () => {
    expect(problemOf([null])).toBe("has a variant that is not an object");
  });

  it("names unknown fields on a variant", () => {
    expect(problemOf([variant({ price: 1 })])).toBe("has a variant with unknown fields: price");
  });

  it("refuses a variant with an empty name", () => {
    expect(problemOf([variant({ name: "" })])).toBe("has a variant whose name is not a non-empty string");
  });

  it("refuses the same name twice in one list", () => {
    expect(problemOf([variant(), variant()])).toBe("authors variant \"20/20\" twice");
  }); // names are the variant's key in the owner note

  it("requires conditions on every variant, even an empty list", () => {
    expect(problemOf([{ name: "20/20" }])).toBe("variant \"20/20\" conditions is not a list");
  }); // unlike a row, a variant's conditions are not optional

  it("refuses an unpriceable flag that is not a boolean", () => {
    expect(problemOf([variant({ unpriceable: 1 })])).toBe(
      "variant \"20/20\" unpriceable must be a boolean when it is present",
    );
  });

  it("refuses a variant that is unpriceable and still has a listing", () => {
    expect(problemOf([variant({ unpriceable: true, listing: { gemLevel: 20 } })])).toBe(
      "variant \"20/20\" is unpriceable and has a listing",
    );
  }); // the two contradict each other

  it("accepts an explicitly priceable variant that has a listing", () => {
    expect(problemOf([variant({ unpriceable: false, listing: { gemLevel: 20 } })])).toBeUndefined();
  }); // only true conflicts with a listing

  it("prefixes a listing problem with the variant's name", () => {
    expect(problemOf([variant({ listing: {} })])).toBe("variant \"20/20\" listing matches nothing");
  });
});

describe("validateVariantTable", () => {
  it("throws the first problem with its source", () => {
    expect(() => validateVariantTable({ Gem: [] }, known, "variants.manual")).toThrow(
      "variants.manual: \"Gem\" authors no variants",
    );
  });
});
