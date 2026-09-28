import { describe, it, expect } from "@jest/globals";
import { categoryTree } from "./category-tree.ts";
import { category, draftOf, ggg } from "../test-helpers.ts";

const at = (category: string, subcategory: string | null = null) => ({ classification: { category, subcategory } });

describe("categoryTree", () => {
  it("counts a subcategory row toward both its category and its subcategory", () => { // two rows in gems, one of them in support
    const tree = categoryTree(draftOf([ggg("a", at("gems", "support")), ggg("b", at("gems"))]));

    expect(tree.nodes).toEqual([
      {
        path: "gems",
        label: "Gems",
        count: 2,
        authored: false,
        children: [{ path: "gems/support", label: "Support", count: 1, authored: false, children: [] }],
      },
    ]);
  });

  it("shows a recorded category with no rows, labelled by its record", () => { // authored means it has a record
    const tree = categoryTree(draftOf([], [category("maps", { name: "Atlas" })]));

    expect(tree.nodes).toEqual([{ path: "maps", label: "Atlas", count: 0, authored: true, children: [] }]);
  });

  it("adds the top level of a recorded subcategory even when the top has no record", () => { // the top is derived from the path
    const tree = categoryTree(draftOf([], [category("maps/boss")]));

    expect(tree.nodes[0]).toMatchObject({
      path: "maps",
      authored: false,
      children: [{ path: "maps/boss", authored: true }],
    });
  });

  it("sorts tops and children by label, not by path", () => { // record names reorder what the paths would
    const tree = categoryTree(
      draftOf(
        [],
        [
          category("a", { name: "Zeta" }),
          category("b", { name: "Alpha" }),
          category("b/z", { name: "A" }),
          category("b/a", { name: "B" }),
        ],
      ),
    );

    expect(tree.nodes.map((node) => node.path)).toEqual(["b", "a"]);
    expect(tree.nodes[0]?.children.map((node) => node.path)).toEqual(["b/z", "b/a"]);
  });

  it("counts every row when no view is given", () => { // no view means no filter, excluded rows included
    const tree = categoryTree(draftOf([ggg("a", at("gems")), ggg("b", { ...at("gems"), excluded: true })]));

    expect(tree.nodes[0]?.count).toBe(2);
  });

  it("counts only rows in the view", () => { // the excluded row drops out of the included view
    const tree = categoryTree(draftOf([ggg("a", at("gems")), ggg("b", { ...at("gems"), excluded: true })]), "included");

    expect(tree.nodes[0]?.count).toBe(1);
  });

  it("hides recorded categories with no rows under the excluded view", () => { // only counted paths are listed there
    const tree = categoryTree(draftOf([ggg("a", { ...at("gems"), excluded: true })], [category("maps")]), "excluded");

    expect(tree.nodes.map((node) => node.path)).toEqual(["gems"]);
  });

  it("hides recorded categories with no rows under the untouched view", () => { // same rule as excluded
    expect(categoryTree(draftOf([], [category("maps")]), "untouched").nodes).toEqual([]);
  });

  it("keeps recorded categories with no rows under the included view", () => { // so a new category can be filled
    expect(categoryTree(draftOf([], [category("maps")]), "included").nodes).toHaveLength(1);
  });
});
