import { describe, it, expect } from "@jest/globals";
import { newCategoryProblem } from "./new-category-problem.ts";

const SHAPE = "Use lowercase letters, digits and hyphens.";

describe("newCategoryProblem", () => {
  it("accepts a free slug made of lowercase letters, digits and hyphens", () => {
    const problem = newCategoryProblem("tier-1", "maps/tier-1", false);

    expect(problem).toBeUndefined(); // all three allowed character kinds at once
  });

  it("refuses an empty slug", () => {
    const problem = newCategoryProblem("", "maps/", false);

    expect(problem).toBe(SHAPE); // the pattern needs one or more characters
  });

  it("refuses uppercase letters", () => {
    const problem = newCategoryProblem("Maps", "Maps", false);

    expect(problem).toBe(SHAPE); // no case folding before the check
  });

  it("refuses a slash, so a slug cannot nest itself", () => {
    const problem = newCategoryProblem("a/b", "a/b", false);

    expect(problem).toBe(SHAPE); // a slash would read as a subcategory path
  });

  it("refuses a trailing space rather than trimming it", () => {
    const problem = newCategoryProblem("maps ", "maps ", false);

    expect(problem).toBe(SHAPE); // anchored at both ends, no trim
  });

  it("reports a badly shaped slug before saying the path is taken", () => {
    const problem = newCategoryProblem("Maps", "Maps", true);

    expect(problem).toBe(SHAPE); // shape check returns first
  });

  it("names the full path when it is already taken", () => {
    const problem = newCategoryProblem("support", "gems/support", true);

    expect(problem).toBe("gems/support already exists."); // the path, not the slug
  });
});
