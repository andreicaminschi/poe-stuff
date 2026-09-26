import { describe, it, expect } from "@jest/globals";
import { categorySaveNote } from "./category-save-note.ts";

describe("categorySaveNote", () => {
  it("says nothing when the category is neither moved nor renamed", () => {
    expect(categorySaveNote("gems", undefined, undefined)).toBeUndefined();
  });

  it("describes a move with its rows", () => {
    expect(categorySaveNote("gems/support", "skills/support", undefined)).toBe(
      "Saving moves this subcategory and every row filed in it to skills/support.",
    );
  });

  it("describes a move then a rename as two undoable steps", () => {
    expect(categorySaveNote("gems/support", "skills/support", "skills/aux")).toMatch(
      /moves this subcategory to skills\/support, then renames it to skills\/aux.*Undo reverts one step at a time\.$/,
    );
  });

  it("renames a subcategory without mentioning subcategories", () => {
    expect(categorySaveNote("gems/support", undefined, "gems/aux")).toBe(
      "Saving renames gems/support to gems/aux, with every row filed in it.",
    );
  });

  it("renames a top-level category together with its subcategories", () => {
    expect(categorySaveNote("gems", undefined, "skills")).toBe(
      "Saving renames gems to skills, with its subcategories and every row filed in it.",
    );
  });
});
