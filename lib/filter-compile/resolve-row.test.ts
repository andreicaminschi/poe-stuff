import { describe, it, expect } from "@jest/globals";
import { resolveForms, resolvePath } from "./resolve-row.ts";

const categories = {
  map: { conditions: [{ condition: "BaseType", operator: "==", from: "baseTypes" }] },
  "map/blighted": {
    conditions: [
      { condition: "BlightedMap", value: true },
      { condition: "BaseType", operator: "==", value: null },
    ],
  },
};

const row = (extra: object = {}) => ({
  name: "Strand Map",
  baseTypes: ["Strand Map"],
  category: "map",
  subcategory: null,
  conditions: [],
  ...extra,
});

describe("resolveForms", () => {
  it("lays the category over the row and fills from:baseTypes", () => {
    expect(resolveForms(categories, row())).toEqual([
      {
        conditions: [{ condition: "BaseType", operator: "==", value: ["Strand Map"], level: "category" }],
        removed: [],
        problems: [],
      },
    ]);
  });

  it("lets a subcategory remove what its category authored, and reports what it removed", () => {
    const [form] = resolveForms(categories, row({ subcategory: "blighted" }));

    expect(form?.conditions.map((condition) => condition.condition)).toEqual(["BlightedMap"]);
    expect(form?.removed).toEqual([
      { condition: "BaseType", operator: "==", from: "baseTypes", level: "category", removedBy: "subcategory" },
    ]);
  });

  it("treats a category with no record as no conditions, not a problem", () => {
    expect(resolveForms(categories, row({ category: "nowhere" }))).toEqual([{ conditions: [], removed: [], problems: [] }]);
  });

  it("resolves once per variant, and flags a variant that resolves like an earlier one", () => {
    const forms = resolveForms(categories, row(), [
      { name: "a", conditions: [] },
      { name: "b", conditions: [] },
      { name: "t16", conditions: [{ condition: "MapTier", operator: ">=", value: 16 }] },
    ]);

    expect(forms.map((form) => form.variant)).toEqual(["a", "b", "t16"]);
    expect(forms[1]?.problems).toEqual(['resolves the same as variant "a"']);
    expect(forms[2]?.problems).toEqual([]);
  });

  it("treats an empty variant list as no variants", () => {
    expect(resolveForms(categories, row(), [])).toHaveLength(1);
  });
});

describe("resolvePath", () => {
  it("composes a path's layers and leaves from as a reference", () => {
    expect(resolvePath(categories, "map/blighted").applied).toEqual([
      { condition: "BlightedMap", value: true, level: "subcategory" },
    ]);
    expect(resolvePath(categories, "map").applied).toEqual([
      { condition: "BaseType", operator: "==", from: "baseTypes", level: "category" },
    ]);
  });
});
