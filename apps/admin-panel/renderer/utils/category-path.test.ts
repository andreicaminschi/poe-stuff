import { describe, it, expect } from "@jest/globals";
import { categoryPath } from "./category-path.ts";

describe("categoryPath", () => {
  it("keeps an edited category at its own path whatever the slug says", () => {
    expect(categoryPath({ kind: "edit", path: "gems/support" }, "maps", "other")).toBe("gems/support");
  });

  it("puts a new subcategory under the chosen parent", () => {
    expect(categoryPath({ kind: "new-subcategory" }, "gems", "awakened")).toBe("gems/awakened");
  });

  it("uses the bare slug for a new top-level category", () => {
    expect(categoryPath({ kind: "new-category" }, "gems", "flasks")).toBe("flasks");
  });
});
