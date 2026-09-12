import { describe, it, expect } from "@jest/globals";
import { betweenRows } from "./between-rows.ts";

const low = { condition: "ItemLevel", operator: ">=", value: 83 };
const high = { condition: "ItemLevel", operator: "<=", value: 85 };
const rarity = { condition: "Rarity", operator: "==", value: "Normal" };

describe("betweenRows", () => {
  it("reads a >= and <= pair on one condition as one between row", () => {
    expect(betweenRows([rarity, low, high])).toEqual([
      { kind: "single", index: 0, condition: rarity },
      { kind: "between", low: 1, high: 2, from: low, to: high },
    ]);
  });

  it("pairs them in either order, the low bound first", () => {
    expect(betweenRows([high, low])).toEqual([{ kind: "between", low: 1, high: 0, from: low, to: high }]);
  });

  it("leaves a lone bound, and bounds on different conditions, single", () => {
    const quality = { condition: "Quality", operator: "<=", value: 20 };

    expect(betweenRows([low, quality]).map((row) => row.kind)).toEqual(["single", "single"]);
  });
});
