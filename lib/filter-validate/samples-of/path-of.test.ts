import { describe, it, expect } from "@jest/globals";
import { pathOf } from "./path-of.ts";

describe("pathOf", () => {
  it("is the category alone for a row with no subcategory", () => {
    expect(pathOf({ key: "k", name: "n", category: "currency", subcategory: null, baseTypes: [] })).toBe("currency");
  });

  it("joins category and subcategory with a slash", () => {
    expect(pathOf({ key: "k", name: "n", category: "gems", subcategory: "skill", baseTypes: [] })).toBe("gems/skill");
  });
});
