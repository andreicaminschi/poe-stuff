import { describe, it, expect } from "@jest/globals";
import { categoryDialogTitle } from "./category-dialog-title.ts";

describe("categoryDialogTitle", () => {
  it("titles a new top-level category the same whether or not it is recorded", () => { // the kind wins over the recorded flag
    expect(categoryDialogTitle({ kind: "new-category" }, true)).toBe("New category");
  });

  it("titles a new subcategory", () => { // no path yet to show
    expect(categoryDialogTitle({ kind: "new-subcategory" }, false)).toBe("New subcategory");
  });

  it("says Edit for a category that already has a record", () => { // the full path is shown
    expect(categoryDialogTitle({ kind: "edit", path: "gems/support" }, true)).toBe("Edit gems/support");
  });

  it("says Author for a category that has no record yet", () => { // saving creates the record
    expect(categoryDialogTitle({ kind: "edit", path: "gems" }, false)).toBe("Author gems");
  });
});
