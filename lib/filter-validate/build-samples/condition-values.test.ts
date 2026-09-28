import { describe, it, expect } from "@jest/globals";
import { conditionValues } from "./condition-values.ts";
import type { SampleCategories, SampleRow } from "../types.ts";

const categories: SampleCategories = {
  gems: { conditions: [{ condition: "Class", operator: "==", value: ["Skill Gems"] }] },
  "gems/skill": { conditions: [{ condition: "GemLevel", operator: ">=", value: 1 }] },
};

const row = (extra: Partial<SampleRow>): SampleRow => ({
  key: "k",
  name: "Arc",
  category: "gems",
  subcategory: "skill",
  baseTypes: ["Arc"],
  ...extra,
});

describe("conditionValues", () => {
  it("collects every value the category, subcategory and row give, by condition name, with lists flattened", () => {
    const gem = row({ conditions: [{ condition: "Quality", operator: ">=", value: 20 }] });

    const values = conditionValues(categories, gem);

    expect(Object.fromEntries(values)).toEqual({ Class: ["Skill Gems"], GemLevel: [1], Quality: [20] }); // ["Skill Gems"] not nested
  });

  it("joins the values of two variants without repeating the one they share", () => {
    const gem = row({
      variants: [
        { name: "low", conditions: [{ condition: "GemLevel", operator: ">=", value: 1 }] },
        { name: "high", conditions: [{ condition: "GemLevel", operator: ">=", value: 21 }] },
      ],
    });

    const values = conditionValues(categories, gem);

    expect(values.get("GemLevel")).toEqual([1, 21]); // 1 from the subcategory and "low" counted once
  });

  it("uses the row's name for a condition that reads it", () => {
    const gem = row({ conditions: [{ condition: "BaseType", operator: "==", from: "name" }] });

    const values = conditionValues(categories, gem);

    expect(values.get("BaseType")).toEqual(["Arc"]); // filled before collecting
  });

  it("skips a condition a lower level removed", () => {
    const gem = row({ conditions: [{ condition: "GemLevel", operator: ">=", value: null }] });

    const values = conditionValues(categories, gem);

    expect(values.has("GemLevel")).toBe(false);
  });

  it("collects nothing for a row on a path with no records and no conditions of its own", () => {
    const values = conditionValues({}, row({}));

    expect(values.size).toBe(0);
  });
});
