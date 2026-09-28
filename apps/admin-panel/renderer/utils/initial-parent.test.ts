import { describe, it, expect } from "@jest/globals";
import { initialParent } from "./initial-parent.ts";

describe("initialParent", () => {
  const tops = [{ path: "currency" }, { path: "gems" }];

  it("uses an edited category's own top level, even one not in the list", () => { // edit ignores selection and tops
    expect(initialParent({ kind: "edit", path: "maps/boss" }, "gems", tops)).toBe("maps");
  });

  it("uses an edited top-level category's own path", () => { // no slash, so the first part is the whole path
    expect(initialParent({ kind: "edit", path: "maps" }, "gems", tops)).toBe("maps");
  });

  it("uses the top level of the current selection", () => { // a selected subcategory counts by its top
    expect(initialParent({ kind: "new-subcategory" }, "gems/support", tops)).toBe("gems");
  });

  it("falls back to the first top level when the selection is not one of them", () => { // only listed tops are offered
    expect(initialParent({ kind: "new-subcategory" }, "maps", tops)).toBe("currency");
  });

  it("falls back to the first top level with nothing selected", () => { // undefined selection
    expect(initialParent({ kind: "new-category" }, undefined, tops)).toBe("currency");
  });

  it("returns an empty parent when there are no top levels", () => { // degenerate input
    expect(initialParent({ kind: "new-category" }, "gems", [])).toBe("");
  });
});
