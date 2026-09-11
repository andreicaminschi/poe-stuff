import { describe, it, expect } from "@jest/globals";
import type { Draft, GggItem } from "../../api/taxonomy/types.ts";
import { rowsIn } from "./rows-in.ts";

const item = (key: string, category: string, subcategory: string | null, excluded = false): GggItem => ({
  source: "ggg",
  key,
  name: key,
  classification: { category, subcategory },
  conditions: [],
  variants: [],
  ...(excluded ? { excluded: true } : {}),
});

const draft: Draft = {
  id: "3.29.2",
  items: {
    a: item("a", "map", null),
    b: item("b", "map", "blighted"),
    c: item("c", "unique-armour", "boots"),
    d: item("d", "map", "blighted", true),
  },
  categories: {},
};

describe("rowsIn", () => {
  it("gives a category its rows and its subcategories' rows", () => {
    expect(rowsIn(draft, "map", "included").map((row) => row.key)).toEqual(["a", "b"]);
  });

  it("gives a subcategory only its own rows", () => {
    expect(rowsIn(draft, "map/blighted", "included").map((row) => row.key)).toEqual(["b"]);
  });

  it("gives only excluded rows in the excluded view", () => {
    expect(rowsIn(draft, "map", "excluded").map((row) => row.key)).toEqual(["d"]);
    expect(rowsIn(draft, "map/blighted", "excluded").map((row) => row.key)).toEqual(["d"]);
  });

  it("gives every row in the view when no category is picked", () => {
    expect(rowsIn(draft, undefined, "included").map((row) => row.key)).toEqual(["a", "b", "c"]);
    expect(rowsIn(draft, undefined, "excluded").map((row) => row.key)).toEqual(["d"]);
  });
});
