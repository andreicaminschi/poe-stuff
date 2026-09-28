import { describe, it, expect } from "@jest/globals";
import { betweenRows } from "./between-rows.ts";

describe("betweenRows", () => {
  it("reads a >= and <= pair on one number as one between row", () => {
    const low = { condition: "ItemLevel", operator: ">=", value: 75 };
    const high = { condition: "ItemLevel", operator: "<=", value: 85 };

    expect(betweenRows([low, high])).toEqual([{ kind: "between", low: 0, high: 1, from: low, to: high }]);
  });

  it("keeps the >= as the low bound when the <= is written first", () => {
    const high = { condition: "ItemLevel", operator: "<=", value: 85 };
    const low = { condition: "ItemLevel", operator: ">=", value: 75 };

    expect(betweenRows([high, low])).toEqual([{ kind: "between", low: 1, high: 0, from: low, to: high }]);
  });

  it("leaves a pair on two different conditions as two single rows", () => {
    const rows = betweenRows([
      { condition: "ItemLevel", operator: ">=", value: 75 },
      { condition: "Quality", operator: "<=", value: 20 },
    ]);

    expect(rows.map((row) => row.kind)).toEqual(["single", "single"]);
  });

  it("does not pair bounds whose values are not numbers", () => {
    const rows = betweenRows([
      { condition: "Rarity", operator: ">=", value: "Magic" },
      { condition: "Rarity", operator: "<=", value: "Rare" },
    ]);

    expect(rows.map((row) => row.kind)).toEqual(["single", "single"]);
  });

  it("pairs a bound with the first partner after it and leaves a third one single", () => {
    const rows = betweenRows([
      { condition: "ItemLevel", operator: ">=", value: 1 },
      { condition: "ItemLevel", operator: "<=", value: 2 },
      { condition: "ItemLevel", operator: "<=", value: 3 },
    ]);

    expect(rows).toMatchObject([
      { kind: "between", low: 0, high: 1 },
      { kind: "single", index: 2 },
    ]);
  });

  it("keeps a condition that sits between the pair in its place after the between row", () => {
    const rows = betweenRows([
      { condition: "ItemLevel", operator: ">=", value: 1 },
      { condition: "Rarity", value: "Rare" },
      { condition: "ItemLevel", operator: "<=", value: 2 },
    ]);

    expect(rows).toMatchObject([
      { kind: "between", low: 0, high: 2 },
      { kind: "single", index: 1 },
    ]);
  });

  it("returns no rows for no conditions", () => {
    expect(betweenRows([])).toEqual([]);
  });
});
