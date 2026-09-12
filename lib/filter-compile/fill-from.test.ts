import { describe, it, expect } from "@jest/globals";
import { fillFrom } from "./fill-from.ts";

const row = { name: "Absolution of Inspiring", baseTypes: ["Absolution"] };

describe("fillFrom", () => {
  it("fills from:name with the row's name and drops the from", () => {
    expect(fillFrom([{ condition: "BaseType", operator: "==", from: "name", level: "category" }], row)).toEqual({
      conditions: [{ condition: "BaseType", operator: "==", value: "Absolution of Inspiring", level: "category" }],
      problems: [],
    });
  });

  it("fills from:baseTypes with the row's base types as a list", () => {
    expect(fillFrom([{ condition: "BaseType", operator: "==", from: "baseTypes", level: "category" }], row)).toEqual({
      conditions: [{ condition: "BaseType", operator: "==", value: ["Absolution"], level: "category" }],
      problems: [],
    });
  });

  it("leaves a condition with no from alone", () => {
    const plain = { condition: "GemLevel", operator: ">=", value: 20, level: "item" as const };

    expect(fillFrom([plain], row).conditions).toEqual([plain]);
  });

  it("reports empty base types and quotes, but only when they are read", () => {
    const quoted = { name: 'A "B"', baseTypes: [] };

    expect(fillFrom([{ condition: "Class", value: ["Maps"], level: "category" }], quoted).problems).toEqual([]);
    expect(
      fillFrom(
        [
          { condition: "BaseType", from: "name", level: "category" },
          { condition: "BaseType", operator: "!=", from: "baseTypes", level: "item" },
        ],
        quoted,
      ).problems,
    ).toEqual(["has a quote in its name, which a .filter line cannot hold", "reads its base types, which are empty"]);
  });

  it("reports a from it cannot fill", () => {
    expect(fillFrom([{ condition: "BaseType", from: "class", level: "item" }], row).problems).toEqual([
      'reads "class", which is not name or baseTypes',
    ]);
  });
});
