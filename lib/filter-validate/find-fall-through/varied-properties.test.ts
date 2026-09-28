import { describe, it, expect } from "@jest/globals";
import { variedProperties } from "./varied-properties.ts";
import type { SampleCategories, SampleRow } from "../types.ts";

const row: SampleRow = { key: "k", name: "n", category: "gems", subcategory: "skill", baseTypes: [] };

describe("variedProperties", () => {
  it("lists, sorted and once each, the properties some set gives two or more values", () => {
    const categories: SampleCategories = {
      "gems/skill": {
        conditions: [],
        samples: [
          { Quality: { values: [0, 20] }, Corrupted: { values: [true] } },
          { GemLevel: { values: [1, 21] }, Quality: { values: [0, 23] } },
        ],
      },
    };

    expect(variedProperties(categories, row)).toEqual(["GemLevel", "Quality"]);
  });

  it("does not count a value read off the row as varied", () => {
    const categories: SampleCategories = {
      "gems/skill": { conditions: [], samples: [{ BaseType: { from: "baseTypes" } }] },
    };

    expect(variedProperties(categories, row)).toEqual([]);
  });

  it("is empty for a path with no sample sets", () => {
    expect(variedProperties({}, row)).toEqual([]);
  });
});
