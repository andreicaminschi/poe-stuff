import { describe, it, expect } from "@jest/globals";
import { sameCondition } from "./same-condition.ts";

describe("sameCondition", () => {
  it("treats a missing operator as equals", () => {
    const same = sameCondition(
      { condition: "Rarity", value: "Rare" },
      { condition: "Rarity", operator: "==", value: "Rare" },
    );

    expect(same).toBe(true); // the default operator is filled in before comparing
  });

  it("treats a missing value as the same as null", () => {
    const same = sameCondition({ condition: "Corrupted" }, { condition: "Corrupted", value: null });

    expect(same).toBe(true);
  });

  it("tells conditions apart by where they are filled from", () => {
    const same = sameCondition({ condition: "BaseType", from: "name" }, { condition: "BaseType", from: "baseTypes" });

    expect(same).toBe(false);
  });

  it("tells conditions apart by operator", () => {
    const same = sameCondition(
      { condition: "ItemLevel", operator: ">=", value: 75 },
      { condition: "ItemLevel", operator: ">", value: 75 },
    );

    expect(same).toBe(false);
  });

  it("compares lists in order, so the same names reordered differ", () => {
    const same = sameCondition({ condition: "Class", value: ["a", "b"] }, { condition: "Class", value: ["b", "a"] });

    expect(same).toBe(false); // JSON key, not a set comparison
  });

  it("tells a number apart from the same digits as text", () => {
    const same = sameCondition({ condition: "ItemLevel", value: 1 }, { condition: "ItemLevel", value: "1" });

    expect(same).toBe(false); // JSON keeps the quotes
  });
});
