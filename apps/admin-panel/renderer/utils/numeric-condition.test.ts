import { describe, it, expect } from "@jest/globals";
import { numericCondition } from "./numeric-condition.ts";

describe("numericCondition", () => {
  it("knows the grammar's numeric conditions, in any case", () => {
    expect(numericCondition("ItemLevel")).toBe(true);
    expect(numericCondition("itemlevel")).toBe(true);
    expect(numericCondition("MapTier")).toBe(true);
  });

  it("refuses everything else", () => {
    expect(numericCondition("Rarity")).toBe(false);
    expect(numericCondition("BaseType")).toBe(false);
    expect(numericCondition("")).toBe(false);
  });
});
