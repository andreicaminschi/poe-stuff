import { describe, it, expect } from "@jest/globals";
import { sampleSets } from "./sample-sets.ts";
import type { SampleCategories } from "../types.ts";

const categories: SampleCategories = {
  gems: { conditions: [], samples: [{ Quality: { values: [1] } }] },
  "gems/skill": { conditions: [], samples: [{ Quality: { values: [2] } }] },
};

describe("sampleSets", () => {
  it("returns the subcategory's sets", () => {
    expect(sampleSets(categories, "gems", "skill")).toEqual([{ Quality: { values: [2] } }]);
  });

  it("returns none for a top-level category even when it declares sets", () => {
    expect(sampleSets(categories, "gems", null)).toBeUndefined();
  });

  it("returns none for a subcategory with no record", () => {
    expect(sampleSets(categories, "gems", "support")).toBeUndefined();
  });
});
