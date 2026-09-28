import { describe, it, expect } from "@jest/globals";
import { categorySaveNote } from "./category-save-note.ts";

describe("categorySaveNote", () => {
  it("says nothing when the category is neither moved nor renamed", () => { // a plain save needs no warning
    expect(categorySaveNote("gems", undefined, undefined)).toBeUndefined();
  });

  it("describes a move with its rows", () => { // move alone is one ledger step
    expect(categorySaveNote("gems/support", "skills/support", undefined)).toBe(
      "Saving moves this subcategory and every row filed in it to skills/support.",
    );
  });

  it("describes a move then a rename as two undoable steps", () => { // both at once is two ledger entries
    expect(categorySaveNote("gems/support", "skills/support", "skills/aux")).toMatch(
      /moves this subcategory to skills\/support, then renames it to skills\/aux.*Undo reverts one step at a time\.$/,
    );
  });

  it("renames a subcategory without mentioning subcategories", () => { // a slash in the old path means it has none
    expect(categorySaveNote("gems/support", undefined, "gems/aux")).toBe(
      "Saving renames gems/support to gems/aux, with every row filed in it.",
    );
  });

  it("renames a top-level category together with its subcategories", () => { // the children follow the rename
    expect(categorySaveNote("gems", undefined, "skills")).toBe(
      "Saving renames gems to skills, with its subcategories and every row filed in it.",
    );
  });
});
