import { describe, it, expect } from "@jest/globals";
import { buildSamples } from "./build-samples.ts";
import type { SampleCategories, SampleRow } from "./types.ts";

const row = (key: string, subcategory: string | null = "skill"): SampleRow => ({
  key,
  name: key,
  category: "gems",
  subcategory,
  baseTypes: [key],
});

const brief = (categories: SampleCategories, rows: readonly SampleRow[]) =>
  [...buildSamples(rows, categories)].map(({ row: one, item, reject }) => ({ key: one.key, item, reject }));

describe("buildSamples", () => {
  it("builds nothing for rows on a path with no sample sets", () => {
    const samples = brief({}, [row("a")]);

    expect(samples).toEqual([]);
  });

  it("builds nothing for a row with no subcategory, even when its category declares sets", () => {
    const categories: SampleCategories = { gems: { conditions: [], samples: [{ Quality: { values: [1] } }] } };

    const samples = brief(categories, [row("a", null)]);

    expect(samples).toEqual([]); // a category holds no samples
  });

  it("builds each row's samples in turn, in the order the set describes them", () => {
    const categories: SampleCategories = {
      "gems/skill": { conditions: [], samples: [{ BaseType: { from: "name" }, Quality: { values: [0, 20] } }] },
    };

    const samples = brief(categories, [row("a"), row("b")]);

    expect(samples).toEqual([
      { key: "a", item: { BaseType: "a", Quality: 0 }, reject: undefined },
      { key: "a", item: { BaseType: "a", Quality: 20 }, reject: undefined },
      { key: "b", item: { BaseType: "b", Quality: 0 }, reject: undefined },
      { key: "b", item: { BaseType: "b", Quality: 20 }, reject: undefined },
    ]);
  });

  it("groups rows by path, so a later row on the first path comes before a row on another path", () => {
    const categories: SampleCategories = {
      "gems/skill": { conditions: [], samples: [{ Quality: { values: [1] } }] },
      "gems/support": { conditions: [], samples: [{ Quality: { values: [2] } }] },
    };

    const samples = brief(categories, [row("a"), row("s", "support"), row("b")]);

    expect(samples.map((one) => one.key)).toEqual(["a", "b", "s"]); // Map.groupBy keeps first-seen path order
  });

  it("builds an item two rows on one path share once for each row", () => {
    const categories: SampleCategories = { "gems/skill": { conditions: [], samples: [{ Quality: { values: [20] } }] } };

    const samples = brief(categories, [row("a"), row("b")]);

    expect(samples).toEqual([
      { key: "a", item: { Quality: 20 }, reject: undefined },
      { key: "b", item: { Quality: 20 }, reject: undefined },
    ]); // deduplicated per row, so overlap stays visible
  });

  it("builds an item that two of one row's sets describe only once", () => {
    const categories: SampleCategories = {
      "gems/skill": { conditions: [], samples: [{ Quality: { values: [0, 20] } }, { Quality: { values: [20] } }] },
    };

    const samples = brief(categories, [row("a")]);

    expect(samples).toEqual([
      { key: "a", item: { Quality: 0 }, reject: undefined },
      { key: "a", item: { Quality: 20 }, reject: undefined },
    ]);
  });

  it("follows each sample with its reject item, tagged with the values written over it", () => {
    const categories: SampleCategories = {
      "gems/skill": { conditions: [], samples: [{ Quality: { values: [20] } }], rejects: [{ Corrupted: { values: [true] } }] },
    };

    const samples = brief(categories, [row("a")]);

    expect(samples).toEqual([
      { key: "a", item: { Quality: 20 }, reject: undefined },
      { key: "a", item: { Quality: 20, Corrupted: true }, reject: "{\"Corrupted\":true}" },
    ]);
  });

  it("drops a reject that builds the same item as the sample it was laid over", () => {
    const categories: SampleCategories = {
      "gems/skill": { conditions: [], samples: [{ Quality: { values: [20] } }], rejects: [{ Quality: { values: [20] } }] },
    };

    const samples = brief(categories, [row("a")]);

    expect(samples).toEqual([{ key: "a", item: { Quality: 20 }, reject: undefined }]); // same seen-set as samples
  });

  it("builds samples one at a time, so a caller can stop after the first", () => {
    const categories: SampleCategories = { "gems/skill": { conditions: [], samples: [{ Quality: { values: [0, 20] } }] } };

    const first = buildSamples([row("a")], categories).next();

    expect(first).toEqual({ done: false, value: { row: row("a"), item: { Quality: 0 } } }); // generator, not an array
  });
});
