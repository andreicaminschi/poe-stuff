import { describe, it, expect } from "@jest/globals";
import { categoryDeleteProblem } from "./category-delete-problem.ts";
import { category, draftOf, ggg } from "../test-helpers.ts";

const gems = (subcategory: string | null) => ({ classification: { category: "gems", subcategory } });

describe("categoryDeleteProblem", () => {
  it("allows deleting an empty category with no subcategories", () => { // undefined means safe to delete
    expect(categoryDeleteProblem(draftOf([], [category("gems")]), "gems")).toBeUndefined();
  });

  it("refuses a category with one row filed in it, in the singular", () => { // "1 row is", not "1 rows are"
    expect(categoryDeleteProblem(draftOf([ggg("a", gems(null))]), "gems")).toBe(
      "1 row is filed here, excluded rows included.",
    );
  });

  it("counts rows in the category's subcategories and excluded rows too", () => { // excluded rows still point at the path
    const draft = draftOf([ggg("a", gems("support")), ggg("b", { ...gems(null), excluded: true })]);

    expect(categoryDeleteProblem(draft, "gems")).toBe("2 rows are filed here, excluded rows included.");
  });

  it("counts only a subcategory's own rows", () => { // a sibling subcategory's rows do not block
    const draft = draftOf([ggg("a", gems("support")), ggg("b", gems("active"))]);

    expect(categoryDeleteProblem(draft, "gems/support")).toBe("1 row is filed here, excluded rows included.");
  });

  it("allows deleting an empty subcategory", () => { // subcategories have no children to check
    expect(categoryDeleteProblem(draftOf([ggg("a", gems("active"))]), "gems/support")).toBeUndefined();
  });

  it("refuses an empty category that still has one subcategory", () => { // "subcategory", singular
    expect(categoryDeleteProblem(draftOf([], [category("gems"), category("gems/support")]), "gems")).toBe(
      "It has 1 subcategory.",
    );
  });

  it("uses the plural for two subcategories", () => { // "subcategories", the y becomes ies
    const draft = draftOf([], [category("gems/a"), category("gems/b")]);

    expect(categoryDeleteProblem(draft, "gems")).toBe("It has 2 subcategories.");
  });

  it("reports rows before subcategories when a category has both", () => { // rows are checked first
    const draft = draftOf([ggg("a", gems(null))], [category("gems/support")]);

    expect(categoryDeleteProblem(draft, "gems")).toBe("1 row is filed here, excluded rows included.");
  });

  it("does not count a sibling whose path only starts with the same letters", () => { // the prefix check includes the slash
    expect(categoryDeleteProblem(draftOf([], [category("gemstones/a")]), "gems")).toBeUndefined();
  });
});
