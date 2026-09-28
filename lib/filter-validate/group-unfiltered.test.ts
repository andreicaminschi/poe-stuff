import { describe, it, expect } from "@jest/globals";
import { groupUnfiltered } from "./group-unfiltered.ts";
import type { UnfilteredRow } from "./types.ts";

const row = (key: string, category: string, subcategory: string | null, count: number): UnfilteredRow => ({
  key,
  name: key,
  category,
  subcategory,
  samples: Array.from({ length: count }, (_, i) => ({ StackSize: i })),
});

describe("groupUnfiltered", () => {
  it("makes no groups from no rows", () => {
    const groups = groupUnfiltered([]);

    expect(groups).toEqual([]);
  });

  it("keeps a category's own rows apart from its subcategory's rows", () => {
    const rows = [row("a", "gems", null, 1), row("b", "gems", "skill", 1), row("c", "gems", "skill", 1)];

    const groups = groupUnfiltered(rows);

    expect(groups.map((one) => [one.path, one.rows.map((r) => r.key)])).toEqual([
      ["gems/skill", ["b", "c"]],
      ["gems", ["a"]],
    ]); // "gems" and "gems/skill" are different paths
  });

  it("sizes a group by its samples rather than its rows, so one row with five samples beats two rows with one each", () => {
    const rows = [row("a", "x", null, 1), row("b", "y", null, 5), row("c", "x", null, 1)];

    const groups = groupUnfiltered(rows);

    expect(groups.map((one) => [one.path, one.count])).toEqual([
      ["y", 5],
      ["x", 2],
    ]);
  });

  it("puts the row with the most samples first inside a group", () => {
    const rows = [row("few", "x", null, 1), row("many", "x", null, 3)];

    const groups = groupUnfiltered(rows);

    expect(groups[0]?.rows.map((r) => r.key)).toEqual(["many", "few"]);
  });

  it("does not reorder the rows it was given", () => {
    const rows = [row("few", "x", null, 1), row("many", "x", null, 3)];

    groupUnfiltered(rows);

    expect(rows.map((r) => r.key)).toEqual(["few", "many"]); // sorts a copy
  });
});
