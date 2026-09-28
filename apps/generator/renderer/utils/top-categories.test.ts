import { describe, it, expect } from "@jest/globals";
import type { Item } from "@poe/filter-style/types";
import { topCategories } from "./top-categories.ts";

const item = (name: string, category: string): Item => ({ name, key: name, category, prices: {} });

describe("topCategories", () => {
  it("lists each category once, Currency first and the rest alphabetically", () => {
    const items = [item("a", "maps"), item("b", "Currency"), item("c", "bases"), item("d", "maps")];

    const keys = topCategories(items);

    expect(keys).toEqual(["Currency", "bases", "maps"]);
  }); // Currency outranks "bases" even though "C" sorts after "b" in en collation

  it("lists nothing when there are no items", () => {
    const keys = topCategories([]);

    expect(keys).toEqual([]);
  }); // degenerate input
});
