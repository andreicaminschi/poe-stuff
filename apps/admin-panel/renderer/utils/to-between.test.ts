import { describe, it, expect } from "@jest/globals";
import { toBetween } from "./to-between.ts";

describe("toBetween", () => {
  it("splits one condition into an at-least and at-most pair in its place", () => {
    const conditions = [
      { condition: "Rarity", value: "Rare" },
      { condition: "ItemLevel", operator: ">", value: 75 },
      { condition: "Quality", value: 20 },
    ];

    const next = toBetween(conditions, 1);

    expect(next).toEqual([
      { condition: "Rarity", value: "Rare" },
      { condition: "ItemLevel", operator: ">=", value: 75 },
      { condition: "ItemLevel", operator: "<=", value: 75 },
      { condition: "Quality", value: 20 },
    ]); // neighbours keep their positions; the old operator is dropped
  });

  it("splits the first condition without losing the rest", () => {
    const conditions = [
      { condition: "ItemLevel", value: 80 },
      { condition: "Quality", value: 20 },
    ];

    const next = toBetween(conditions, 0);

    expect(next).toEqual([
      { condition: "ItemLevel", operator: ">=", value: 80 },
      { condition: "ItemLevel", operator: "<=", value: 80 },
      { condition: "Quality", value: 20 },
    ]);
  });

  it("starts both bounds at zero when the value is not a number", () => {
    const next = toBetween([{ condition: "ItemLevel", value: "high" }], 0);

    expect(next.map((one) => one.value)).toEqual([0, 0]); // numeric text is not parsed either
  });

  it("drops where the condition was filled from when splitting it", () => {
    const next = toBetween([{ condition: "BaseType", from: "name", value: 3 }], 0);

    expect(next[0]).toEqual({ condition: "BaseType", operator: ">=", value: 3 });
  });

  it("returns the same list when the index is past the end", () => {
    const conditions = [{ condition: "Rarity", value: "Rare" }];

    const next = toBetween(conditions, 5);

    expect(next).toBe(conditions); // the very same reference, not a copy
  });

  it("returns the same list for a negative index", () => {
    const conditions = [{ condition: "Rarity", value: "Rare" }];

    const next = toBetween(conditions, -1);

    expect(next).toBe(conditions); // bracket access, not at(), so -1 is not the last
  });
});
