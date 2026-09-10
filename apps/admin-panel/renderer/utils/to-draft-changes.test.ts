import { describe, it, expect } from "@jest/globals";
import type { GggItem } from "../../api/taxonomy.types.ts";
import { NO_CHANGES } from "./no-changes.ts";
import { toDraftChanges } from "./to-draft-changes.ts";
import { withItem } from "./with-item.ts";

const item: GggItem = {
  source: "ggg",
  key: "a",
  name: "a",
  classification: { category: "currency", subcategory: null },
  conditions: [],
  variants: [],
};

describe("toDraftChanges", () => {
  it("sends only the tables that changed", () => {
    expect(toDraftChanges(withItem(NO_CHANGES, item))).toEqual({ items: { a: item } });
  });

  it("sends nothing when nothing changed", () => {
    expect(toDraftChanges(NO_CHANGES)).toEqual({});
  });
});
