import { describe, it, expect } from "@jest/globals";
import { toBetween } from "./to-between.ts";

describe("toBetween", () => {
  it("splits one condition into a >= and <= pair in its place", () => {
    const conditions = [
      { condition: "Rarity", value: "Rare" },
      { condition: "ItemLevel", operator: ">", value: 75 },
      { condition: "Quality", value: 20 },
    ];

    expect(toBetween(conditions, 1)).toEqual([
      { condition: "Rarity", value: "Rare" },
      { condition: "ItemLevel", operator: ">=", value: 75 },
      { condition: "ItemLevel", operator: "<=", value: 75 },
      { condition: "Quality", value: 20 },
    ]);
  });

  it("starts both bounds at zero when the value is not a number", () => {
    expect(toBetween([{ condition: "ItemLevel", value: "high" }], 0).map((one) => one.value)).toEqual([0, 0]);
  });

  it("drops the condition's from when splitting it", () => {
    expect(toBetween([{ condition: "BaseType", from: "name", value: 3 }], 0)[0]).toEqual({
      condition: "BaseType",
      operator: ">=",
      value: 3,
    });
  });

  it("returns the same list when the index is out of range", () => {
    const conditions = [{ condition: "Rarity", value: "Rare" }];

    expect(toBetween(conditions, 5)).toBe(conditions);
  });
});
