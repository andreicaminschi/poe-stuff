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
  it("returns no groups for no rows", () => {
    expect(groupUnfiltered([])).toEqual([]);
  });

  it("groups rows by category, or by category and subcategory", () => {
    const groups = groupUnfiltered([
      row("a", "gems", null, 1),
      row("b", "gems", "skill", 1),
      row("c", "gems", "skill", 1),
    ]);

    expect(groups.map((one) => [one.path, one.rows.map((r) => r.key)])).toEqual([
      ["gems/skill", ["b", "c"]],
      ["gems", ["a"]],
    ]);
  });

  it("counts a group by its samples, not its rows, and puts the largest first", () => {
    const groups = groupUnfiltered([row("a", "x", null, 1), row("b", "y", null, 5), row("c", "x", null, 1)]);

    expect(groups.map((one) => [one.path, one.count])).toEqual([
      ["y", 5],
      ["x", 2],
    ]);
  });

  it("orders rows inside a group by most samples first", () => {
    const groups = groupUnfiltered([row("few", "x", null, 1), row("many", "x", null, 3)]);

    expect(groups[0]?.rows.map((r) => r.key)).toEqual(["many", "few"]);
  });
});
