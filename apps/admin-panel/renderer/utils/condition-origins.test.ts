import { describe, it, expect } from "@jest/globals";
import { conditionOrigins } from "./condition-origins.ts";

describe("conditionOrigins", () => {
  it("names only the category for a top-level row with no item or variant", () => {
    expect(conditionOrigins({ category: "currency", subcategory: null })).toEqual({ category: "currency" });
  });

  it("names the subcategory by its full path", () => {
    expect(conditionOrigins({ category: "gems", subcategory: "support" }, "Added Fire", "awakened")).toEqual({
      category: "gems",
      subcategory: "gems/support",
      item: "Added Fire",
      variant: "awakened",
    });
  });
});
