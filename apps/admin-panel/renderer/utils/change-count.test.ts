import { describe, it, expect } from "@jest/globals";
import type { GggItem } from "../../api/taxonomy.types.ts";
import { changeCount } from "./change-count.ts";
import { NO_CHANGES } from "./no-changes.ts";
import { withCategory } from "./with-category.ts";
import { withItem } from "./with-item.ts";

const item: GggItem = {
  source: "ggg",
  key: "a",
  name: "a",
  classification: { category: "currency", subcategory: null },
  conditions: [],
  variants: [],
};

describe("changeCount", () => {
  it("counts edited items and categories together", () => {
    const changes = withCategory(withItem(NO_CHANGES, item), "map", null);

    expect(changeCount(changes)).toBe(2);
  });

  it("counts an item edited twice once", () => {
    expect(changeCount(withItem(withItem(NO_CHANGES, item), item))).toBe(1);
  });
});
