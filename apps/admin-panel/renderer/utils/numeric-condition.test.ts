import { describe, it, expect } from "@jest/globals";
import { numericCondition } from "./numeric-condition.ts";

describe("numericCondition", () => {
  it("knows ItemLevel compares as a number", () => {
    expect(numericCondition("ItemLevel")).toBe(true);
  });

  it("ignores case and surrounding spaces", () => {
    expect(numericCondition("  itemlevel ")).toBe(true);
  });

  it("does not treat Rarity as numeric, though it is ordered", () => {
    expect(numericCondition("Rarity")).toBe(false);
  });

  it("does not know a name outside the grammar", () => {
    expect(numericCondition("Madeup")).toBe(false);
  });
});
