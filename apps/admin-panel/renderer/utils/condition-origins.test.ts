import { describe, it, expect } from "@jest/globals";
import { conditionOrigins } from "./condition-origins.ts";

describe("conditionOrigins", () => {
  it("names only the category for a top-level row with no item or variant", () => { // absent levels are left out, not undefined
    expect(conditionOrigins({ category: "currency", subcategory: null })).toEqual({ category: "currency" });
  });

  it("names the subcategory by its full path along with the item and variant", () => { // category/subcategory, not the bare slug
    expect(conditionOrigins({ category: "gems", subcategory: "support" }, "Added Fire", "awakened")).toEqual({
      category: "gems",
      subcategory: "gems/support",
      item: "Added Fire",
      variant: "awakened",
    });
  });

  it("names the item but no variant when only the item is given", () => { // the item's own conditions, before a variant is picked
    expect(conditionOrigins({ category: "currency", subcategory: null }, "Chaos Orb")).toEqual({
      category: "currency",
      item: "Chaos Orb",
    });
  });
});
