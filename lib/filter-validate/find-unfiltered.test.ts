import { describe, it, expect } from "@jest/globals";
import { parseFilter } from "@poe/filter-eval/parse-filter";
import { findUnfiltered } from "./find-unfiltered.ts";
import type { SampleCategories, SampleRow } from "./types.ts";

const row = (key: string, subcategory: string | null = "skill"): SampleRow => ({
  key,
  name: key,
  category: "gems",
  subcategory,
  baseTypes: [],
});

const categories: SampleCategories = {
  "gems/skill": {
    conditions: [],
    samples: [{ Quality: { values: [0, 20] } }],
    rejects: [{ Corrupted: { values: [true] } }],
  },
};

const takesQuality20 = parseFilter("Show\n    Quality >= 20\n    #@ tier=T1 verb=take a\n");

describe("findUnfiltered", () => {
  it("reports the samples no block takes, grouped by the row that built them", () => {
    const report = findUnfiltered(takesQuality20, [row("a")], categories);

    expect(report).toEqual({
      sampled: 2,
      unfiltered: 1,
      unsampled: [],
      rows: [{ key: "a", name: "a", category: "gems", subcategory: "skill", samples: [{ Quality: 0 }] }],
    }); // reject samples are not counted
  });

  it("counts a sample a Hide block takes as filtered", () => {
    const hideAll = parseFilter("Hide\n    #@ tier=hidden verb=take a\n");

    expect(findUnfiltered(hideAll, [row("a")], categories).unfiltered).toBe(0);
  });

  it("reports every sample as unfiltered for an empty filter", () => {
    expect(findUnfiltered([], [row("a")], categories).unfiltered).toBe(2);
  });

  it("lists each path holding rows but no sample sets once, sorted", () => {
    const rows = [row("x", "support"), row("y", "support"), row("z", null), row("a")];

    expect(findUnfiltered([], rows, categories).unsampled).toEqual(["gems", "gems/support"]);
  });
});
