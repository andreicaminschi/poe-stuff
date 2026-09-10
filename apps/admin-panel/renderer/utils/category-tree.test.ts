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

  describe("with a view", () => {
    const flagged: Draft = {
      ...draft,
      items: { ...draft.items, e: { ...item("e", "map", "blighted"), excluded: true } },
    };

    it("counts only unflagged rows when included", () => {
      expect(categoryTree(flagged, "included").nodes.find((node) => node.path === "map")?.count).toBe(2);
    });

    it("lists only categories with flagged rows when excluded", () => {
      const tree = categoryTree(flagged, "excluded");

      expect(tree.nodes.map((node) => node.path)).toEqual(["map"]);
      expect(tree.nodes[0]?.count).toBe(1);
      expect(tree.nodes[0]?.children.map((child) => child.path)).toEqual(["map/blighted"]);
    });
  });
});
