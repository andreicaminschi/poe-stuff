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
  it("collects every value the category, subcategory and row resolve to", () => {
    const values = conditionValues(
      categories,
      row({ conditions: [{ condition: "Quality", operator: ">=", value: 20 }] }),
    );

    expect(Object.fromEntries(values)).toEqual({ Class: ["Skill Gems"], GemLevel: [1], Quality: [20] });
  });

  it("merges each variant's values without repeating one", () => {
    const values = conditionValues(
      categories,
      row({
        variants: [
          { name: "low", conditions: [{ condition: "GemLevel", operator: ">=", value: 1 }] },
          { name: "high", conditions: [{ condition: "GemLevel", operator: ">=", value: 21 }] },
        ],
      }),
    );

    expect(values.get("GemLevel")).toEqual([1, 21]);
  });

  it("fills a value read off the row's name", () => {
    const values = conditionValues(
      categories,
      row({ conditions: [{ condition: "BaseType", operator: "==", from: "name" }] }),
    );

    expect(values.get("BaseType")).toEqual(["Arc"]);
  });

  it("returns nothing for a row on a path with no records and no conditions", () => {
    expect(conditionValues({}, row({})).size).toBe(0);
  });
});
