import { describe, it, expect } from "@jest/globals";
import { pathOf } from "./path-of.ts";

describe("pathOf", () => {
  it("is the category alone when there is no subcategory", () => {
    expect(pathOf({ category: "gems", subcategory: null })).toBe("gems");
  });

  it("joins category and subcategory with a slash", () => {
    expect(pathOf({ category: "gems", subcategory: "support" })).toBe("gems/support");
  });

  it("keeps an empty subcategory as a trailing slash", () => {
    expect(pathOf({ category: "gems", subcategory: "" })).toBe("gems/");
  });
});
