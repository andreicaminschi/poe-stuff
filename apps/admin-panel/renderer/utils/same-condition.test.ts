import { describe, it, expect } from "@jest/globals";
import { sameCondition } from "./same-condition.ts";

describe("sameCondition", () => {
  it("treats a missing operator as ==", () => {
    expect(sameCondition({ condition: "Rarity", value: "Rare" }, { condition: "Rarity", operator: "==", value: "Rare" })).toBe(true);
  });

  it("treats a missing value as the same as null", () => {
    expect(sameCondition({ condition: "Corrupted" }, { condition: "Corrupted", value: null })).toBe(true);
  });

  it("tells conditions apart by from", () => {
    expect(sameCondition({ condition: "BaseType", from: "name" }, { condition: "BaseType", from: "baseTypes" })).toBe(false);
  });

  it("compares lists by order", () => {
    expect(sameCondition({ condition: "Class", value: ["a", "b"] }, { condition: "Class", value: ["b", "a"] })).toBe(false);
  });

  it("tells a number apart from the same digits as text", () => {
    expect(sameCondition({ condition: "ItemLevel", value: 1 }, { condition: "ItemLevel", value: "1" })).toBe(false);
  });
});
