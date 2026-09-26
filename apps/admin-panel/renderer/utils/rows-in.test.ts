import { describe, it, expect } from "@jest/globals";
import { rowsIn } from "./rows-in.ts";
import { draftOf, ggg } from "../test-helpers.ts";

const draft = draftOf([
  ggg("top", { classification: { category: "gems", subcategory: null } }),
  ggg("sub", { classification: { category: "gems", subcategory: "support" } }),
  ggg("other", { classification: { category: "maps", subcategory: null } }),
  ggg("gone", { classification: { category: "gems", subcategory: null }, excluded: true }),
]);

const keys = (items: readonly { key: string }[]) => items.map((item) => item.key);

describe("rowsIn", () => {
  it("returns every row in the view when no path is selected", () => {
    expect(keys(rowsIn(draft, undefined, "included"))).toEqual(["top", "sub", "other"]);
  });

  it("includes a category's subcategory rows", () => {
    expect(keys(rowsIn(draft, "gems", "included"))).toEqual(["top", "sub"]);
  });

  it("narrows to one subcategory", () => {
    expect(keys(rowsIn(draft, "gems/support", "included"))).toEqual(["sub"]);
  });

  it("applies the view before the path", () => {
    expect(keys(rowsIn(draft, "gems", "excluded"))).toEqual(["gone"]);
  });
});
