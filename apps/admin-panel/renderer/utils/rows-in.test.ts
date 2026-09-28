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
    const rows = rowsIn(draft, undefined, "included");

    expect(keys(rows)).toEqual(["top", "sub", "other"]); // draft order kept
  });

  it("includes a category's subcategory rows", () => {
    const rows = rowsIn(draft, "gems", "included");

    expect(keys(rows)).toEqual(["top", "sub"]);
  });

  it("narrows to one subcategory", () => {
    const rows = rowsIn(draft, "gems/support", "included");

    expect(keys(rows)).toEqual(["sub"]);
  });

  it("applies the view as well as the path", () => {
    const rows = rowsIn(draft, "gems", "excluded");

    expect(keys(rows)).toEqual(["gone"]);
  });

  it("returns nothing for a path no row is filed under", () => {
    const rows = rowsIn(draft, "flasks", "included");

    expect(rows).toEqual([]);
  });
});
