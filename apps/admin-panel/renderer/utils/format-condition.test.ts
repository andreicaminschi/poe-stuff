import { describe, it, expect } from "@jest/globals";
import { formatCondition } from "./format-condition.ts";

describe("formatCondition", () => {
  it("writes == when no operator is given", () => { // a filter's default operator
    expect(formatCondition({ condition: "ItemLevel", value: 75 })).toBe("ItemLevel == 75");
  });

  it("writes a zero as 0 rather than dropping it", () => { // zero is not "no value"
    expect(formatCondition({ condition: "Quality", value: 0 })).toBe("Quality == 0");
  });

  it("quotes each entry of a list", () => { // entries are space-separated
    expect(formatCondition({ condition: "Class", operator: "=", value: ["Rings", "Amulets"] })).toBe(
      "Class = \"Rings\" \"Amulets\"",
    );
  });

  it("quotes a single string", () => { // same as a one-entry list
    expect(formatCondition({ condition: "Rarity", value: "Rare" })).toBe("Rarity == \"Rare\"");
  });

  it("writes booleans the way a filter does", () => { // capitalised True and False
    expect(formatCondition({ condition: "Corrupted", value: false })).toBe("Corrupted == False");
  });

  it("shows a removed condition as removed", () => { // null means a lower level drops it
    expect(formatCondition({ condition: "Corrupted", value: null })).toBe("Corrupted == (removed)");
  });

  it("writes no trailing space when there is no value", () => { // trimEnd after the empty value
    expect(formatCondition({ condition: "Corrupted" })).toBe("Corrupted ==");
  });

  it("shows where a filled-in value comes from instead of its value", () => { // from wins over value
    expect(formatCondition({ condition: "BaseType", from: "name", value: "ignored" })).toBe("BaseType == ‹name›");
  });
});
