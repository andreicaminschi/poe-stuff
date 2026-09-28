import { describe, it, expect } from "@jest/globals";
import { findCategoryLayers, resolveForms, resolvePath, type CategoryRecords } from "./resolve-row.ts";

const categories: CategoryRecords = {
  armour: { conditions: [{ condition: "Class", value: "Body Armours" }] },
  "armour/unique": { conditions: [{ condition: "Rarity", value: "Unique" }] },
};

const row = {
  name: "Vaal Regalia",
  baseTypes: ["Vaal Regalia"],
  category: "armour",
  subcategory: "unique",
  conditions: [{ condition: "BaseType", from: "name" }],
};

describe("findCategoryLayers", () => {
  it("gives the category's conditions first and the subcategory's second", () => {
    const layers = findCategoryLayers(categories, "armour", "unique");

    expect(layers.map((l) => l.level)).toEqual(["category", "subcategory"]); // top first
  });

  it("gives only the category's conditions when the row has no subcategory", () => {
    const layers = findCategoryLayers(categories, "armour", null);

    expect(layers.map((l) => l.level)).toEqual(["category"]);
  });

  it("adds nothing for a category that has no record, even when a same-named subcategory exists under another category", () => {
    const layers = findCategoryLayers(categories, "weapons", "unique");

    expect(layers).toEqual([]); // looks up weapons/unique, not armour/unique
  });
});

describe("resolvePath", () => {
  it("leaves a condition that reads from the row as a reference, since a path has no row", () => {
    const records = { a: { conditions: [{ condition: "BaseType", from: "name" }] } };

    const result = resolvePath(records, "a");

    expect(result.applied).toEqual([{ condition: "BaseType", from: "name", level: "category" }]); // no fill step
  });

  it("reads a two-part path as a category and its subcategory", () => {
    const result = resolvePath(categories, "armour/unique");

    expect(result.applied.map((c) => c.level)).toEqual(["category", "subcategory"]);
  });

  it("ignores anything after the second part of the path", () => {
    const result = resolvePath(categories, "armour/unique/extra");

    expect(result.applied.map((c) => c.level)).toEqual(["category", "subcategory"]); // destructures two parts
  });

  it("composes nothing for an empty path", () => {
    const result = resolvePath(categories, "");

    expect(result).toEqual({ applied: [], removed: [] }); // "" is an unknown category
  });
});

describe("resolveForms", () => {
  it("draws a row with no variants as one unnamed form with category, subcategory and row conditions filled", () => {
    const forms = resolveForms(categories, row);

    expect(forms).toEqual([
      {
        conditions: [
          { condition: "Class", value: "Body Armours", level: "category" },
          { condition: "Rarity", value: "Unique", level: "subcategory" },
          { condition: "BaseType", value: "Vaal Regalia", level: "item" },
        ],
        removed: [],
        problems: [],
      },
    ]); // no `variant` key at all
  });

  it("draws a row with an empty variant list exactly as one with no variants", () => {
    const forms = resolveForms(categories, row, []);

    expect(forms).toEqual(resolveForms(categories, row)); // length 0 guard
  });

  it("draws one named form per variant, in order, each laid over the row", () => {
    const variants = [
      { name: "corrupted", conditions: [{ condition: "Corrupted", value: true }] },
      { name: "clean", conditions: [{ condition: "Corrupted", value: false }] },
    ];

    const forms = resolveForms(categories, row, variants);

    expect(forms.map((f) => [f.variant, f.conditions.at(-1)?.value])).toEqual([
      ["corrupted", true],
      ["clean", false],
    ]); // variants don't leak into each other
  });

  it("records a subcategory condition that a variant removed", () => {
    const variants = [{ name: "any", conditions: [{ condition: "Rarity", value: null }] }];

    const [form] = resolveForms(categories, row, variants);

    expect(form?.removed).toEqual([{ condition: "Rarity", value: "Unique", level: "subcategory", removedBy: "variant" }]);
  });

  it("carries a problem found while filling from the row onto the form", () => {
    const [form] = resolveForms(categories, { ...row, name: "" });

    expect(form?.problems).toEqual(["reads its name, which is empty"]);
  });

  it("reports the third variant as resolving the same as the first", () => {
    const variants = [
      { name: "a", conditions: [{ condition: "Corrupted", value: true }] },
      { name: "b", conditions: [{ condition: "Corrupted", value: false }] },
      { name: "c", conditions: [{ condition: "Corrupted", value: true }] },
    ];

    const forms = resolveForms(categories, row, variants);

    expect(forms.map((f) => f.problems)).toEqual([[], [], ["resolves the same as variant \"a\""]]); // names the first, not the nearest
  });

  it("counts two variants as the same when they differ only in which level set a condition", () => {
    const variants = [
      { name: "a", conditions: [] },
      { name: "b", conditions: [{ condition: "Rarity", value: "Unique" }] },
    ];

    const forms = resolveForms(categories, row, variants);

    expect(forms[1]?.problems).toEqual(["resolves the same as variant \"a\""]); // signature drops level and overrides
  });

  it("reports no duplicate between two identical variants that share a name", () => {
    const variants = [
      { name: "a", conditions: [] },
      { name: "a", conditions: [] },
    ];

    const forms = resolveForms(categories, row, variants);

    expect(forms.map((f) => f.problems)).toEqual([[], []]); // compares by name, not position
  });
});
