import { describe, expect, it } from "@jest/globals";
import type { Taxonomy } from "@poe/taxonomy/get-taxonomy.types";
import { fromTaxonomy } from "./from-taxonomy.ts";

const taxonomyOf = (items: object, authored: object = {}): Taxonomy =>
  ({ version: "1", items, authored }) as unknown as Taxonomy;

const entry = (name: string, extra: object = {}) => ({ name, category: "c", subcategory: null, ...extra });

describe("fromTaxonomy", () => {
  it("uses an item's own name as its base type", () => {
    const rows = fromTaxonomy(taxonomyOf({ k: entry("Ruby Ring") }));

    expect(rows).toEqual([{ key: "k", name: "Ruby Ring", category: "c", subcategory: null, baseTypes: ["Ruby Ring"] }]);
  }); // no optional keys appear when the entry has none

  it("leaves out excluded, quest and unfilterable items and keeps one with those flags set to false", () => {
    const rows = fromTaxonomy(
      taxonomyOf({
        a: entry("A", { excluded: true }),
        b: entry("B", { quest: true }),
        c: entry("C", { filterable: false }),
        d: entry("D", { filterable: true, excluded: false }),
      }),
    );

    expect(rows.map((row) => row.key)).toEqual(["d"]);
  }); // `filterable` defaults to true, so only an explicit false drops it

  it("leaves out an item an authored row replaces, even when that authored row is itself excluded", () => {
    const rows = fromTaxonomy(taxonomyOf({ a: entry("A") }, { "authored/x": { ...entry("X"), baseType: "A", replaces: ["a"], excluded: true } }));

    expect(rows).toEqual([]);
  }); // replaces is collected before the authored filter runs

  it("uses an authored row's base type rather than its name, and lists it after every item", () => {
    const rows = fromTaxonomy(taxonomyOf({ b: entry("B") }, { "authored/x": { ...entry("X"), baseType: "Base" } }));

    expect(rows.map((row) => [row.key, row.baseTypes])).toEqual([
      ["b", ["B"]],
      ["authored/x", ["Base"]],
    ]);
  }); // authored rows are named for the filter, not the game

  it("keeps an authored row that is marked unfilterable", () => {
    const rows = fromTaxonomy(taxonomyOf({}, { "authored/x": { ...entry("X"), baseType: "B", filterable: false } }));

    expect(rows).toHaveLength(1);
  }); // the filterable rule only applies to items

  it("marks a row unpriceable only when the taxonomy says true", () => {
    const rows = fromTaxonomy(taxonomyOf({ a: entry("A", { unpriceable: false }), b: entry("B", { unpriceable: true }) }));

    expect(rows.map((row) => row.unpriceable)).toEqual([undefined, true]);
  }); // false is dropped, not copied

  it("copies conditions, variants, listing and an item's display name, but no display name for an authored row", () => {
    const extra = { conditions: [{ condition: "Rarity" }], variants: [], listing: { name: "L" }, displayName: "D" };

    const rows = fromTaxonomy(taxonomyOf({ a: entry("A", extra) }, { "authored/x": { ...entry("X", extra), baseType: "B" } }));

    expect(rows).toEqual([
      { key: "a", name: "A", category: "c", subcategory: null, baseTypes: ["A"], ...extra },
      {
        key: "authored/x",
        name: "X",
        category: "c",
        subcategory: null,
        baseTypes: ["B"],
        conditions: extra.conditions,
        variants: [],
        listing: extra.listing,
      },
    ]);
  }); // an empty variants list is still copied
});
