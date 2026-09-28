import { describe, it, expect } from "@jest/globals";
import { formatCondition } from "./format-condition.ts";

describe("formatCondition", () => {
  it("defaults the operator to ==", () => {
    expect(formatCondition({ condition: "ItemLevel", value: 75 })).toBe("ItemLevel == 75");
  });

  it("quotes each entry of a list", () => {
    expect(formatCondition({ condition: "Class", operator: "=", value: ["Rings", "Amulets"] })).toBe(
      "Class = \"Rings\" \"Amulets\"",
    );
  });

  it("quotes a single string", () => {
    expect(formatCondition({ condition: "Rarity", value: "Rare" })).toBe("Rarity == \"Rare\"");
  });

  it("writes booleans the way a filter does", () => {
    expect(formatCondition({ condition: "Corrupted", value: false })).toBe("Corrupted == False");
  });

  it("shows a removed condition as removed", () => {
    expect(formatCondition({ condition: "Corrupted", value: null })).toBe("Corrupted == (removed)");
  });

  it("writes no trailing space when there is no value", () => {
    expect(formatCondition({ condition: "Corrupted" })).toBe("Corrupted ==");
  });

  it("shows where a filled-in value comes from instead of its value", () => {
    expect(formatCondition({ condition: "BaseType", from: "name", value: "ignored" })).toBe("BaseType == ‹name›");
  });
});
