import { describe, expect, it } from "@jest/globals";
import type { Item } from "../item.ts";
import { groupByCategory } from "./group-by-category.ts";

const row = (key: string, name: string, category: string): Item => ({
  key,
  name,
  category,
  subcategory: null,
  baseTypes: [name],
});

describe("groupByCategory", () => {
  it("answers an empty map for no rows", () => {
    expect(groupByCategory([]).size).toBe(0);
  });

  it("keys each group by the category's slug", () => {
    expect([...groupByCategory([row("a", "A", "Stackable Currency")]).keys()]).toEqual(["stackable-currency"]);
  });

  it("sorts a group by name, then by key", () => {
    const groups = groupByCategory([row("b", "Zed", "c"), row("z", "Amy", "c"), row("a", "Amy", "c")]);

    expect(groups.get("c")?.map((item) => item.key)).toEqual(["a", "z", "b"]);
  });

  it("refuses two categories whose names share a slug", () => {
    expect(() => groupByCategory([row("a", "A", "Gems"), row("b", "B", "gems!")])).toThrow('both slug to "gems"');
  });

  it("leaves the rows it was handed in their order", () => {
    const rows = [row("b", "B", "c"), row("a", "A", "c")];

    groupByCategory(rows);

    expect(rows.map((item) => item.key)).toEqual(["b", "a"]);
  });
});
