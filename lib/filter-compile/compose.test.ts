import { describe, it, expect } from "@jest/globals";
import { compose, composeTrace } from "./compose.ts";

describe("compose", () => {
  it("lets a lower level replace a condition with the same name and operator, and says what it overrode", () => {
    expect(
      compose([
        { level: "category", conditions: [{ condition: "GemLevel", operator: ">=", value: 1 }] },
        { level: "item", conditions: [{ condition: "GemLevel", operator: ">=", value: 3 }] },
      ]),
    ).toEqual([{ condition: "GemLevel", operator: ">=", value: 3, level: "item", overrides: ["category"] }]);
  });

  it("keeps two conditions that differ only by operator", () => {
    expect(
      compose([
        {
          level: "item",
          conditions: [
            { condition: "GemLevel", operator: ">=", value: 3 },
            { condition: "GemLevel", operator: "<=", value: 4 },
          ],
        },
      ]).length,
    ).toBe(2);
  });

  it("removes a condition written as null", () => {
    expect(
      compose([
        { level: "category", conditions: [{ condition: "BaseType", operator: "==", from: "name" }] },
        { level: "subcategory", conditions: [{ condition: "BaseType", operator: "==", value: null }] },
      ]),
    ).toEqual([]);
  });
});

describe("composeTrace", () => {
  it("records what was removed, where it came from and what removed it", () => {
    expect(
      composeTrace([
        { level: "category", conditions: [{ condition: "BaseType", operator: "==", from: "baseTypes" }] },
        { level: "item", conditions: [{ condition: "BaseType", operator: "==", value: null }] },
      ]),
    ).toEqual({
      applied: [],
      removed: [{ condition: "BaseType", operator: "==", from: "baseTypes", level: "category", removedBy: "item" }],
    });
  });

  it("carries every level a condition overrode down the chain", () => {
    const { applied } = composeTrace([
      { level: "category", conditions: [{ condition: "Quality", operator: ">=", value: 1 }] },
      { level: "subcategory", conditions: [{ condition: "Quality", operator: ">=", value: 10 }] },
      { level: "item", conditions: [{ condition: "Quality", operator: ">=", value: 20 }] },
    ]);

    expect(applied[0]?.overrides).toEqual(["category", "subcategory"]);
  });

  it("ignores a removal with nothing above it to remove", () => {
    expect(composeTrace([{ level: "item", conditions: [{ condition: "Corrupted", value: null }] }])).toEqual({
      applied: [],
      removed: [],
    });
  });
});
