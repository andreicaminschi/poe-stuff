import { describe, it, expect } from "@jest/globals";
import { fieldDiff } from "./field-diff.ts";

describe("fieldDiff", () => {
  it("lists only the fields that changed", () => {
    const before = { key: "a", name: "Old", classification: { category: "map", subcategory: null }, conditions: [] };
    const after = { key: "a", name: "New", classification: { category: "gem", subcategory: null }, conditions: [] };

    expect(fieldDiff(before, after)).toEqual([
      { field: "name", before: "Old", after: "New" },
      {
        field: "classification",
        before: '{"category":"map","subcategory":null}',
        after: '{"category":"gem","subcategory":null}',
      },
    ]);
  });

  it("shows a new record's fields against nothing", () => {
    expect(fieldDiff(undefined, { path: "gem", tiering: "chaos" })).toEqual([
      { field: "tiering", before: "—", after: "chaos" },
    ]);
  });

  it("shows a deleted record's fields against nothing", () => {
    expect(fieldDiff({ path: "gem", tiering: "chaos" }, null)).toEqual([
      { field: "tiering", before: "chaos", after: "—" },
    ]);
  });

  it("shows a flag that was added", () => {
    expect(fieldDiff({ name: "a" }, { name: "a", excluded: true })).toEqual([
      { field: "excluded", before: "—", after: "true" },
    ]);
  });
});
