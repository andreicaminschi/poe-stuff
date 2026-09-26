import { describe, it, expect } from "@jest/globals";
import { newCategoryProblem } from "./new-category-problem.ts";

describe("newCategoryProblem", () => {
  it("accepts lowercase letters, digits and hyphens", () => {
    expect(newCategoryProblem("tier-1", "maps/tier-1", false)).toBeUndefined();
  });

  it("refuses an empty slug", () => {
    expect(newCategoryProblem("", "maps/", false)).toBe("Use lowercase letters, digits and hyphens.");
  });

  it("refuses uppercase letters", () => {
    expect(newCategoryProblem("Maps", "Maps", false)).toBe("Use lowercase letters, digits and hyphens.");
  });

  it("refuses a slash, so a slug cannot nest itself", () => {
    expect(newCategoryProblem("a/b", "a/b", false)).toBe("Use lowercase letters, digits and hyphens.");
  });

  it("checks the slug's shape before whether the path is taken", () => {
    expect(newCategoryProblem("Maps", "Maps", true)).toBe("Use lowercase letters, digits and hyphens.");
  });

  it("names the path when it is already taken", () => {
    expect(newCategoryProblem("maps", "maps", true)).toBe("maps already exists.");
  });
});
