import { describe, it, expect } from "@jest/globals";
import { conditionLine } from "./condition-line.ts";

describe("conditionLine", () => {
  it("quotes every string of a list", () => {
    expect(conditionLine({ condition: "BaseType", operator: "==", value: ["Chaos Orb", "Divine Orb"] })).toEqual({
      line: 'BaseType == "Chaos Orb" "Divine Orb"',
    });
  });

  it("quotes a single string", () => {
    expect(conditionLine({ condition: "Class", operator: "==", value: "Maps" })).toEqual({ line: 'Class == "Maps"' });
  });

  it("writes a boolean as True or False, with no operator when there is none", () => {
    expect(conditionLine({ condition: "BlightedMap", value: true })).toEqual({ line: "BlightedMap True" });
  });

  it("writes a number bare", () => {
    expect(conditionLine({ condition: "GemLevel", operator: ">=", value: 20 })).toEqual({ line: "GemLevel >= 20" });
  });

  it("writes an ordered value bare, and spells the name canonically", () => {
    expect(conditionLine({ condition: "rarity", operator: "<", value: "Rare" })).toEqual({ line: "Rarity < Rare" });
  });

  it("refuses an unknown condition, a missing value and a wrong type", () => {
    expect(conditionLine({ condition: "Nope", value: 1 })).toEqual({ problem: '"Nope" is not a filter condition' });
    expect(conditionLine({ condition: "BaseType", from: "name" })).toEqual({ problem: "BaseType has no value" });
    expect(conditionLine({ condition: "GemLevel", value: "high" })).toEqual({ problem: 'GemLevel cannot hold "high"' });
  });

  it("refuses a string with a quote in it", () => {
    expect(conditionLine({ condition: "BaseType", value: 'A "B"' })).toEqual({
      problem: 'BaseType cannot hold "A \\"B\\""',
    });
  });
});
