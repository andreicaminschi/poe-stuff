import { describe, it, expect } from "@jest/globals";
import { betweenRows } from "./between-rows.ts";

describe("betweenRows", () => {
  it("reads an at-least 75 and at-most 85 on one number as one between row", () => { // low and high are indexes back into the list
    const low = { condition: "ItemLevel", operator: ">=", value: 75 };
    const high = { condition: "ItemLevel", operator: "<=", value: 85 };

    expect(betweenRows([low, high])).toEqual([{ kind: "between", low: 0, high: 1, from: low, to: high }]);
  });

  it("keeps the at-least bound as the low end when the at-most is written first", () => { // the row sits at the first index, low points at the second
    const high = { condition: "ItemLevel", operator: "<=", value: 85 };
    const low = { condition: "ItemLevel", operator: ">=", value: 75 };

    expect(betweenRows([high, low])).toEqual([{ kind: "between", low: 1, high: 0, from: low, to: high }]);
  });

  it("leaves bounds on two different conditions as two single rows", () => { // the partner must name the same condition
    const rows = betweenRows([
      { condition: "ItemLevel", operator: ">=", value: 75 },
      { condition: "Quality", operator: "<=", value: 20 },
    ]);

    expect(rows.map((row) => row.kind)).toEqual(["single", "single"]);
  });

  it("does not pair bounds whose values are not numbers", () => { // Rarity has an order but is text
    const rows = betweenRows([
      { condition: "Rarity", operator: ">=", value: "Magic" },
      { condition: "Rarity", operator: "<=", value: "Rare" },
    ]);

    expect(rows.map((row) => row.kind)).toEqual(["single", "single"]);
  });

  it("does not pair two at-least bounds on the same number", () => { // only opposite operators pair
    const rows = betweenRows([
      { condition: "ItemLevel", operator: ">=", value: 1 },
      { condition: "ItemLevel", operator: ">=", value: 2 },
    ]);

    expect(rows.map((row) => row.kind)).toEqual(["single", "single"]);
  });

  it("pairs a bound with the first partner after it and leaves a third one single", () => { // a paired index is never reused
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

  it("keeps a condition that sits between the pair in its place after the between row", () => { // the pair is emitted at its first half
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

  it("returns no rows for no conditions", () => { // degenerate input
    expect(betweenRows([])).toEqual([]);
  });
});
