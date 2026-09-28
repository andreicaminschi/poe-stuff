import { describe, it, expect } from "@jest/globals";
import { formatPath } from "./format-path.ts";

describe("formatPath", () => {
  it("is the category alone for a row with no subcategory", () => {
    const path = formatPath({ category: "currency", subcategory: null });

    expect(path).toBe("currency"); // no trailing slash
  });

  it("joins the category and subcategory with a slash", () => {
    const path = formatPath({ category: "gems", subcategory: "skill" });

    expect(path).toBe("gems/skill");
  });
});
