import { describe, it, expect } from "@jest/globals";
import { sampleSets } from "./sample-sets.ts";
import type { SampleCategories } from "../types.ts";

const categories: SampleCategories = {
  gems: { conditions: [], samples: [{ Quality: { values: [1] } }] },
  "gems/skill": { conditions: [], samples: [{ Quality: { values: [2] } }] },
};

describe("sampleSets", () => {
  it("gives the subcategory's sample sets", () => {
    const sets = sampleSets(categories, "gems", "skill");

    expect(sets).toEqual([{ Quality: { values: [2] } }]);
  });

  it("gives none for a row with no subcategory, even when its category declares sets", () => {
    const sets = sampleSets(categories, "gems", null);

    expect(sets).toBeUndefined(); // a category holds no samples
  });

  it("gives none for a subcategory with no record", () => {
    const sets = sampleSets(categories, "gems", "support");

    expect(sets).toBeUndefined(); // no fallback to the category
  });
});
