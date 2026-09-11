import { describe, it, expect } from "@jest/globals";
import type { Category, Draft, GggItem } from "../../api/taxonomy/types.ts";
import { categoryDeleteProblem } from "./category-delete-problem.ts";

const item = (key: string, category: string, subcategory: string | null, excluded = false): GggItem => ({
  source: "ggg",
  key,
  name: key,
  classification: { category, subcategory },
  conditions: [],
  variants: [],
  ...(excluded ? { excluded: true } : {}),
});

const category = (path: string): Category => ({ path, tiering: "chaos", conditions: [] });

const draft: Draft = {
  id: "3.29.2",
  items: { a: item("a", "map", "blighted"), b: item("b", "gem", null, true) },
  categories: {
    map: category("map"),
    "map/blighted": category("map/blighted"),
    "map/empty": category("map/empty"),
    gem: category("gem"),
    lonely: category("lonely"),
    parent: category("parent"),
    "parent/child": category("parent/child"),
  },
};

describe("categoryDeleteProblem", () => {
  it("allows an empty category with no subcategories", () => {
    expect(categoryDeleteProblem(draft, "lonely")).toBeUndefined();
  });

  it("allows an empty subcategory", () => {
    expect(categoryDeleteProblem(draft, "map/empty")).toBeUndefined();
  });

  it("refuses a subcategory with rows", () => {
    expect(categoryDeleteProblem(draft, "map/blighted")).toBe("1 row is filed here, excluded rows included.");
  });

  it("counts excluded rows", () => {
    expect(categoryDeleteProblem(draft, "gem")).toBe("1 row is filed here, excluded rows included.");
  });

  it("refuses a category whose subcategories hold rows", () => {
    expect(categoryDeleteProblem(draft, "map")).toBe("1 row is filed here, excluded rows included.");
  });

  it("refuses a category with an empty subcategory record", () => {
    expect(categoryDeleteProblem(draft, "parent")).toBe("It has 1 subcategory.");
  });
});
