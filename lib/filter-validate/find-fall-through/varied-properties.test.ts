import { describe, it, expect } from "@jest/globals";
import { variedProperties } from "./varied-properties.ts";
import type { SampleCategories, SampleRow } from "../types.ts";

const row: SampleRow = { key: "k", name: "n", category: "gems", subcategory: "skill", baseTypes: [] };

describe("variedProperties", () => {
  it("lists, sorted and once each, the properties a set gives two or more values, skipping one given a single value", () => {
    const categories: SampleCategories = {
      "gems/skill": {
        conditions: [],
        samples: [
          { Quality: { values: [0, 20] }, Corrupted: { values: [true] } },
          { GemLevel: { values: [1, 21] }, Quality: { values: [0, 23] } },
        ],
      },
    };

    const varied = variedProperties(categories, row);

    expect(varied).toEqual(["GemLevel", "Quality"]); // Corrupted has one value; Quality appears in both sets
  });

  it("does not count a property read off the row as varied, even when the row has two base types", () => {
    const categories: SampleCategories = { "gems/skill": { conditions: [], samples: [{ BaseType: { from: "baseTypes" } }] } };

    const varied = variedProperties(categories, row);

    expect(varied).toEqual([]); // only written values count
  });

  it("lists nothing for a path with no sample sets", () => {
    const varied = variedProperties({}, row);

    expect(varied).toEqual([]);
  });
});
