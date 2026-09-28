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
  it("reports the samples no block takes, under the row that built them, not counting reject samples", () => {
    const report = findUnfiltered(takesQuality20, [row("a")], categories);

    expect(report).toEqual({
      sampled: 2,
      unfiltered: 1,
      unsampled: [],
      rows: [{ key: "a", name: "a", category: "gems", subcategory: "skill", samples: [{ Quality: 0 }] }],
    }); // two samples; the two rejects are not "sampled"
  });

  it("counts an item that two rows on one path both build only once, under the first row", () => {
    const report = findUnfiltered(takesQuality20, [row("a"), row("b")], categories);

    expect([report.sampled, report.unfiltered, report.rows.map((one) => one.key)]).toEqual([2, 1, ["a"]]); // path repeats skipped
  });

  it("counts a sample a Hide block takes as filtered", () => {
    const hideAll = parseFilter("Hide\n    #@ tier=hidden verb=take a\n");

    const report = findUnfiltered(hideAll, [row("a")], categories);

    expect(report.unfiltered).toBe(0); // only falling off the end counts
  });

  it("reports every sample as unfiltered against an empty filter", () => {
    const report = findUnfiltered([], [row("a")], categories);

    expect(report.unfiltered).toBe(2);
  });

  it("lists each path that holds rows but no sample sets once, sorted", () => {
    const rows = [row("x", "support"), row("y", "support"), row("z", null), row("a")];

    const report = findUnfiltered([], rows, categories);

    expect(report.unsampled).toEqual(["gems", "gems/support"]); // deduplicated
  });
});
