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
  it("makes no groups from no rows", () => {
    const groups = groupByCategory([]);

    expect(groups.size).toBe(0);
  }); // degenerate input

  it("names the Stackable Currency group stackable-currency", () => {
    const groups = groupByCategory([row("a", "A", "Stackable Currency")]);

    expect([...groups.keys()]).toEqual(["stackable-currency"]);
  }); // the key is the file name, so it is slugged

  it("sorts a group by name and breaks a tie between two rows called Amy by key", () => {
    const groups = groupByCategory([row("b", "Zed", "c"), row("z", "Amy", "c"), row("a", "Amy", "c")]);

    expect(groups.get("c")?.map((item) => item.key)).toEqual(["a", "z", "b"]);
  }); // two metadata ids can share a display name

  it("refuses two categories, Gems and gems!, whose names slug to the same file", () => {
    const rows = [row("a", "A", "Gems"), row("b", "B", "gems!")];

    expect(() => groupByCategory(rows)).toThrow("both slug to \"gems\"");
  }); // one would silently overwrite the other on disk

  it("leaves the rows it was handed in their original order", () => {
    const rows = [row("b", "B", "c"), row("a", "A", "c")];

    groupByCategory(rows);

    expect(rows.map((item) => item.key)).toEqual(["b", "a"]);
  }); // sorts a copy
});
