import { describe, it, expect } from "@jest/globals";
import type { Draft, GggItem } from "../../api/taxonomy.types.ts";
import { rowsIn } from "./rows-in.ts";

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
  categories: {},
};

describe("rowsIn", () => {
  it("gives a category its rows and its subcategories' rows", () => {
    expect(rowsIn(draft, "map").map((row) => row.key)).toEqual(["a", "b"]);
  });

  it("gives a subcategory only its own rows", () => {
    expect(rowsIn(draft, "map/blighted").map((row) => row.key)).toEqual(["b"]);
  });

  it("gives nothing when no category is picked", () => {
    expect(rowsIn(draft, undefined)).toEqual([]);
  });
});
