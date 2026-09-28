import { describe, it, expect } from "@jest/globals";
import { categoryPath } from "./category-path.ts";

describe("categoryPath", () => {
  it("keeps an edited category at its own path whatever the slug says", () => { // a rename is a separate step
    expect(categoryPath({ kind: "edit", path: "gems/support" }, "maps", "other")).toBe("gems/support");
  });

  it("puts a new subcategory under the chosen parent", () => { // parent and slug join with a slash
    expect(categoryPath({ kind: "new-subcategory" }, "gems", "awakened")).toBe("gems/awakened");
  });

  it("uses the bare slug for a new top-level category and ignores the parent", () => { // the parent picker still holds a value
    expect(categoryPath({ kind: "new-category" }, "gems", "flasks")).toBe("flasks");
  });
});
