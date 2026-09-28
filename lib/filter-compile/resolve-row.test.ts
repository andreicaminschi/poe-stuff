import { describe, it, expect } from "@jest/globals";
import { categoryLayers, resolveForms, resolvePath, type CategoryRecords } from "./resolve-row.ts";

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

describe("categoryLayers", () => {
  it("gives the category layer then the subcategory layer", () => {
    expect(categoryLayers(categories, "armour", "unique").map((l) => l.level)).toEqual(["category", "subcategory"]);
  });

  it("gives only the category layer when there is no subcategory", () => {
    expect(categoryLayers(categories, "armour", null).map((l) => l.level)).toEqual(["category"]);
  });

  it("skips a category or subcategory that has no record", () => {
    expect(categoryLayers(categories, "weapons", "unique")).toEqual([]);
  }); // looks up weapons/unique, not armour/unique
});

describe("resolvePath", () => {
  it("composes a category and subcategory path, leaving references unfilled", () => {
    const result = resolvePath({ a: { conditions: [{ condition: "BaseType", from: "name" }] } }, "a");

    expect(result.applied).toEqual([{ condition: "BaseType", from: "name", level: "category" }]);
  });

  it("reads a two-part path as category and subcategory", () => {
    expect(resolvePath(categories, "armour/unique").applied.map((c) => c.level)).toEqual(["category", "subcategory"]);
  });

  it("ignores anything past the second path segment", () => {
    expect(resolvePath(categories, "armour/unique/extra").applied).toHaveLength(2);
  });

  it("composes nothing for an empty path", () => {
    expect(resolvePath(categories, "")).toEqual({ applied: [], removed: [] });
  });
});

describe("resolveForms", () => {
  it("gives one form without a variant name when the row has no variants", () => {
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
    ]);
  });

  it("treats an empty variant list the same as no variants", () => {
    expect(resolveForms(categories, row, [])).toEqual(resolveForms(categories, row));
  });

  it("gives one form per variant, each named and laid over the row", () => {
    const forms = resolveForms(categories, row, [
      { name: "corrupted", conditions: [{ condition: "Corrupted", value: true }] },
      { name: "clean", conditions: [{ condition: "Corrupted", value: false }] },
    ]);

    expect(forms.map((f) => [f.variant, f.conditions.at(-1)?.value])).toEqual([
      ["corrupted", true],
      ["clean", false],
    ]);
  });

  it("carries what a variant removed", () => {
    const [form] = resolveForms(categories, row, [{ name: "any", conditions: [{ condition: "Rarity", value: null }] }]);

    expect(form?.removed).toEqual([
      { condition: "Rarity", value: "Unique", level: "subcategory", removedBy: "variant" },
    ]);
  });

  it("carries a fill problem onto the form", () => {
    const [form] = resolveForms(categories, { ...row, name: "" });

    expect(form?.problems).toEqual(["reads its name, which is empty"]);
  });

  it("reports a variant that resolves the same as an earlier one, naming the first", () => {
    const forms = resolveForms(categories, row, [
      { name: "a", conditions: [{ condition: "Corrupted", value: true }] },
      { name: "b", conditions: [{ condition: "Corrupted", value: false }] },
      { name: "c", conditions: [{ condition: "Corrupted", value: true }] },
    ]);

    expect(forms.map((f) => f.problems)).toEqual([[], [], ["resolves the same as variant \"a\""]]);
  });

  it("counts two variants as the same even when the levels their conditions came from differ", () => {
    const forms = resolveForms(categories, row, [
      { name: "a", conditions: [] },
      { name: "b", conditions: [{ condition: "Rarity", value: "Unique" }] },
    ]);

    expect(forms[1]?.problems).toEqual(["resolves the same as variant \"a\""]);
  }); // signature drops level and overrides

  it("does not report a duplicate when both variants share the same name", () => {
    const forms = resolveForms(categories, row, [
      { name: "a", conditions: [] },
      { name: "a", conditions: [] },
    ]);

    expect(forms.map((f) => f.problems)).toEqual([[], []]);
  }); // compares by name, not position
});
