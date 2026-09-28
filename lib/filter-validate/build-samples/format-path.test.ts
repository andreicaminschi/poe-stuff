import { describe, it, expect } from "@jest/globals";
import { formatPath } from "./format-path.ts";

describe("formatPath", () => {
  it("is the category alone for a row with no subcategory", () => {
    expect(formatPath({ key: "k", name: "n", category: "currency", subcategory: null, baseTypes: [] })).toBe(
      "currency",
    );
  });

  it("joins category and subcategory with a slash", () => {
    expect(formatPath({ key: "k", name: "n", category: "gems", subcategory: "skill", baseTypes: [] })).toBe(
      "gems/skill",
    );
  });
});
