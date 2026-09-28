import { describe, it, expect } from "@jest/globals";
import { pathOf } from "./path-of.ts";

describe("pathOf", () => {
  it("is the category alone when there is no subcategory", () => {
    const path = pathOf({ category: "gems", subcategory: null });

    expect(path).toBe("gems"); // no trailing slash for null
  });

  it("joins category and subcategory with a slash", () => {
    const path = pathOf({ category: "gems", subcategory: "support" });

    expect(path).toBe("gems/support");
  });

  it("keeps an empty subcategory as a trailing slash", () => {
    const path = pathOf({ category: "gems", subcategory: "" });

    expect(path).toBe("gems/"); // only null means top level, not falsy
  });
});
