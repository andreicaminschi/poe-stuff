import { describe, it, expect } from "@jest/globals";
import type { Item } from "@poe/filter-style/types";
import { topCategories } from "./top-categories.ts";

const item = (name: string, category: string): Item => ({ name, key: name, category, prices: {} });

describe("topCategories", () => {
  it("lists each category once, Currency first and the rest alphabetically", () => {
    const items = [item("a", "maps"), item("b", "Currency"), item("c", "bases"), item("d", "maps")];

    expect(topCategories(items)).toEqual(["Currency", "bases", "maps"]);
  });

  it("answers with nothing for no items", () => {
    expect(topCategories([])).toEqual([]);
  });
});
