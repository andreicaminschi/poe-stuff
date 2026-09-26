import { describe, it, expect } from "@jest/globals";
import { samplesOf } from "./samples-of.ts";
import type { SampleCategories, SampleRow } from "./types.ts";

const row = (key: string, subcategory: string | null = "skill"): SampleRow => ({
  key,
  name: key,
  category: "gems",
  subcategory,
  baseTypes: [key],
});

const brief = (categories: SampleCategories, rows: readonly SampleRow[]) =>
  [...samplesOf(rows, categories)].map(({ row: one, item, reject }) => ({ key: one.key, item, reject }));

describe("samplesOf", () => {
  it("yields nothing for rows whose path has no sample sets", () => {
    expect(brief({}, [row("a")])).toEqual([]);
  });

  it("yields nothing for a top-level category row", () => {
    const categories: SampleCategories = { gems: { conditions: [], samples: [{ Quality: { values: [1] } }] } };

    expect(brief(categories, [row("a", null)])).toEqual([]);
  });

  it("yields each row's samples in set order", () => {
    const categories: SampleCategories = {
      "gems/skill": { conditions: [], samples: [{ BaseType: { from: "name" }, Quality: { values: [0, 20] } }] },
    };

    expect(brief(categories, [row("a"), row("b")])).toEqual([
      { key: "a", item: { BaseType: "a", Quality: 0 }, reject: undefined },
      { key: "a", item: { BaseType: "a", Quality: 20 }, reject: undefined },
      { key: "b", item: { BaseType: "b", Quality: 0 }, reject: undefined },
      { key: "b", item: { BaseType: "b", Quality: 20 }, reject: undefined },
    ]);
  });

  it("yields a sample two rows on one path both build only for the first row", () => {
    const categories: SampleCategories = { "gems/skill": { conditions: [], samples: [{ Quality: { values: [20] } }] } };

    expect(brief(categories, [row("a"), row("b")])).toEqual([{ key: "a", item: { Quality: 20 }, reject: undefined }]);
  });

  it("follows each sample with its reject overrides, tagged with the override", () => {
    const categories: SampleCategories = {
      "gems/skill": {
        conditions: [],
        samples: [{ Quality: { values: [20] } }],
        rejects: [{ Corrupted: { values: [true] } }],
      },
    };

    expect(brief(categories, [row("a")])).toEqual([
      { key: "a", item: { Quality: 20 }, reject: undefined },
      { key: "a", item: { Quality: 20, Corrupted: true }, reject: '{"Corrupted":true}' },
    ]);
  });

  it("skips a reject that builds the same item as an earlier sample", () => {
    const categories: SampleCategories = {
      "gems/skill": { conditions: [], samples: [{ Quality: { values: [20] } }], rejects: [{ Quality: { values: [20] } }] },
    };

    expect(brief(categories, [row("a")])).toEqual([{ key: "a", item: { Quality: 20 }, reject: undefined }]);
  });
});
