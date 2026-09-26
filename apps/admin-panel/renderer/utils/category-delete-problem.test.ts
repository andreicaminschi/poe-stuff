import { describe, it, expect } from "@jest/globals";
import { categoryDeleteProblem } from "./category-delete-problem.ts";
import { category, draftOf, ggg } from "../test-helpers.ts";

const gems = (subcategory: string | null) => ({ classification: { category: "gems", subcategory } });

describe("categoryDeleteProblem", () => {
  it("allows deleting an empty category with no subcategories", () => {
    expect(categoryDeleteProblem(draftOf([], [category("gems")]), "gems")).toBeUndefined();
  });

  it("refuses a category with one row filed in it, in the singular", () => {
    expect(categoryDeleteProblem(draftOf([ggg("a", gems(null))]), "gems")).toBe(
      "1 row is filed here, excluded rows included.",
    );
  });

  it("counts rows in the category's subcategories and excluded rows too", () => {
    const draft = draftOf([ggg("a", gems("support")), ggg("b", { ...gems(null), excluded: true })]);

    expect(categoryDeleteProblem(draft, "gems")).toBe("2 rows are filed here, excluded rows included.");
  });

  it("counts only a subcategory's own rows", () => {
    const draft = draftOf([ggg("a", gems("support")), ggg("b", gems("active"))]);

    expect(categoryDeleteProblem(draft, "gems/support")).toBe("1 row is filed here, excluded rows included.");
  });

  it("allows deleting an empty subcategory", () => {
    expect(categoryDeleteProblem(draftOf([ggg("a", gems("active"))]), "gems/support")).toBeUndefined();
  });

  it("refuses an empty category that still has one subcategory", () => {
    expect(categoryDeleteProblem(draftOf([], [category("gems"), category("gems/support")]), "gems")).toBe(
      "It has 1 subcategory.",
    );
  });

  it("uses the plural for several subcategories", () => {
    const draft = draftOf([], [category("gems/a"), category("gems/b")]);

    expect(categoryDeleteProblem(draft, "gems")).toBe("It has 2 subcategories.");
  });

  it("does not count a sibling whose path only starts with the same letters", () => {
    expect(categoryDeleteProblem(draftOf([], [category("gemstones/a")]), "gems")).toBeUndefined();
  });
});
