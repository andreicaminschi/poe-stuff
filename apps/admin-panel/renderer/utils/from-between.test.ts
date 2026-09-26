import { describe, it, expect } from "@jest/globals";
import { fromBetween } from "./from-between.ts";

describe("fromBetween", () => {
  const pair = [
    { condition: "Rarity", value: "Rare" },
    { condition: "ItemLevel", operator: ">=", value: 75 },
    { condition: "ItemLevel", operator: "<=", value: 85 },
  ];

  it("drops the high bound and rewrites the low one under the new operator", () => {
    expect(fromBetween(pair, 1, 2, "==")).toEqual([
      { condition: "Rarity", value: "Rare" },
      { condition: "ItemLevel", operator: "==", value: 75 },
    ]);
  });

  it("keeps the low bound in its own position when the high one came first", () => {
    const flipped = [pair[2]!, pair[0]!, pair[1]!];

    expect(fromBetween(flipped, 2, 0, ">")).toEqual([
      { condition: "Rarity", value: "Rare" },
      { condition: "ItemLevel", operator: ">", value: 75 },
    ]);
  });
});
