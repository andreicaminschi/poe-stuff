import { describe, it, expect } from "@jest/globals";
import { fromBetween } from "./from-between.ts";
import { toBetween } from "./to-between.ts";

const rarity = { condition: "Rarity", operator: "==", value: "Normal" };

describe("toBetween", () => {
  it("splits a number into a >= and <= pair in place", () => {
    expect(toBetween([{ condition: "ItemLevel", operator: ">=", value: 83 }, rarity], 0)).toEqual([
      { condition: "ItemLevel", operator: ">=", value: 83 },
      { condition: "ItemLevel", operator: "<=", value: 83 },
      rarity,
    ]);
  });

  it("starts a condition with no number at zero", () => {
    expect(toBetween([{ condition: "ItemLevel", value: "" }], 0)).toEqual([
      { condition: "ItemLevel", operator: ">=", value: 0 },
      { condition: "ItemLevel", operator: "<=", value: 0 },
    ]);
  });
});

describe("fromBetween", () => {
  it("keeps the low bound under the new operator and drops the high one", () => {
    const pair = [
      rarity,
      { condition: "ItemLevel", operator: ">=", value: 83 },
      { condition: "ItemLevel", operator: "<=", value: 85 },
    ];

    expect(fromBetween(pair, 1, 2, "==")).toEqual([rarity, { condition: "ItemLevel", operator: "==", value: 83 }]);
  });
});
