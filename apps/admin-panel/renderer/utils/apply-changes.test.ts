import { describe, it, expect } from "@jest/globals";
import type { Draft, GggItem } from "../../api/taxonomy.types.ts";
import { applyChanges } from "./apply-changes.ts";
import { NO_CHANGES } from "./no-changes.ts";
import { withItem } from "./with-item.ts";

const item = (key: string, extra: Partial<GggItem> = {}): GggItem => ({
  source: "ggg",
  key,
  name: key,
  classification: { category: "currency", subcategory: null },
  conditions: [],
  variants: [],
  ...extra,
});

const draft: Draft = {
  id: "3.29.2",
  items: { a: item("a", { variants: [{ name: "v", conditions: [] }] }), b: item("b") },
  categories: {},
};

describe("applyChanges", () => {
  it("lays an edited item over the saved one and leaves the rest", () => {
    const changes = withItem(NO_CHANGES, item("a", { classification: { category: "map", subcategory: null } }));
    const view = applyChanges(draft, changes);

    expect(view.items.a?.classification.category).toBe("map");
    expect(view.items.b).toBe(draft.items.b);
  });

  it("carries a variant edit as an edit to its item", () => {
    const view = applyChanges(draft, withItem(NO_CHANGES, item("a", { variants: [{ name: "w", conditions: [] }] })));

    expect(view.items.a?.variants).toEqual([{ name: "w", conditions: [] }]);
  });

  it("does not touch the draft it was given", () => {
    applyChanges(draft, withItem(NO_CHANGES, item("a")));

    expect(draft.items.a?.variants).toHaveLength(1);
  });
});
