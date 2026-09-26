import { describe, it, expect } from "@jest/globals";
import { initialParent } from "./initial-parent.ts";

describe("initialParent", () => {
  const tops = [{ path: "currency" }, { path: "gems" }];

  it("uses an edited category's own top level", () => {
    expect(initialParent({ kind: "edit", path: "maps/boss" }, "gems", tops)).toBe("maps");
  });

  it("uses the top level of the current selection", () => {
    expect(initialParent({ kind: "new-subcategory" }, "gems/support", tops)).toBe("gems");
  });

  it("falls back to the first top level when the selection is not one of them", () => {
    expect(initialParent({ kind: "new-subcategory" }, "maps", tops)).toBe("currency");
  });

  it("falls back to the first top level with nothing selected", () => {
    expect(initialParent({ kind: "new-category" }, undefined, tops)).toBe("currency");
  });

  it("returns an empty parent when there are no top levels", () => {
    expect(initialParent({ kind: "new-category" }, "gems", [])).toBe("");
  });
});
