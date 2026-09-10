import { describe, it, expect } from "@jest/globals";
import type { Draft, GggItem } from "../../api/taxonomy.types.ts";
import { categoryTree } from "./category-tree.ts";

const item = (key: string, category: string, subcategory: string | null): GggItem => ({
  source: "ggg",
  key,
  name: key,
  classification: { category, subcategory },
  conditions: [],
  variants: [],
});

const draft: Draft = {
  id: "3.29.2",
  items: {
    a: item("a", "map", null),
    b: item("b", "map", "blighted"),
    c: item("c", "unique-armour", "boots"),
    d: item("d", "excluded", null),
  },
  categories: { map: { path: "map", tiering: "chaos", conditions: [] } },
};

describe("categoryTree", () => {
  it("shows used paths that have no record, marked as such", () => {
    const tree = categoryTree(draft);
    const unique = tree.nodes.find((node) => node.path === "unique-armour");

    expect(unique?.authored).toBe(false);
    expect(unique?.children.map((child) => child.path)).toEqual(["unique-armour/boots"]);
  });

  it("counts a category's rows including its subcategories'", () => {
    expect(categoryTree(draft).nodes.find((node) => node.path === "map")?.count).toBe(2);
  });

  it("pins excluded apart from the rest", () => {
    const tree = categoryTree(draft);

    expect(tree.excluded?.path).toBe("excluded");
    expect(tree.nodes.some((node) => node.path === "excluded")).toBe(false);
  });
});
