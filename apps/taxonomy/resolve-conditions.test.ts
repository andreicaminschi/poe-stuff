import { describe, expect, it } from "@jest/globals";
import { resolutionProblems, resolveCategory, resolveRow, unauthoredCategories } from "./resolve-conditions.ts";
import type { Version } from "./types.ts";

const baseTypeFrom = { condition: "BaseType", operator: "==", from: "baseTypes" };

const version: Version = {
  items: {
    Ring: { name: "Ruby Ring", category: "rings", subcategory: null },
    Hidden: { name: "Hidden", category: "loose", subcategory: null, filterable: false },
    Gone: { name: "Gone", category: "loose", subcategory: null, excluded: true },
    Loose: { name: "Loose", category: "loose", subcategory: null },
  },
  categories: { rings: { conditions: [{ condition: "Class", value: "Rings" }, baseTypeFrom] } },
  authored: {
    "authored/mirror": {
      name: "Mirror Ring",
      baseType: "Ruby Ring",
      category: "rings",
      subcategory: null,
      reason: "r",
    },
  },
  variants: {},
};

const valuesOf = (conditions: readonly { condition: string; value?: unknown }[]) =>
  Object.fromEntries(conditions.map((one) => [one.condition, one.value]));

describe("resolveRow", () => {
  it("fills a base type from an item row off the row's own name", () => {
    const [resolution] = resolveRow(version, "Ring");

    expect(resolution?.key).toBe("Ring");
    expect(valuesOf(resolution?.conditions ?? [])).toMatchObject({ Class: "Rings", BaseType: ["Ruby Ring"] });
  });

  it("fills a base type from an authored row off its base type, not its name", () => {
    const [resolution] = resolveRow(version, "authored/mirror");

    expect(valuesOf(resolution?.conditions ?? []).BaseType).toEqual(["Ruby Ring"]);
  }); // "Mirror Ring" is no base the client knows

  it("gives one resolution per variant, each carrying the variant name", () => {
    const withVariants: Version = {
      ...version,
      variants: {
        Ring: [
          { name: "low", conditions: [{ condition: "ItemLevel", operator: "<", value: 50 }] },
          { name: "high", conditions: [{ condition: "ItemLevel", operator: ">=", value: 50 }] },
        ],
      },
    };

    expect(resolveRow(withVariants, "Ring").map((resolution) => resolution.variant)).toEqual(["low", "high"]);
  }); // variants replace the bare row rather than joining it

  it("throws for a key the version does not have", () => {
    expect(() => resolveRow(version, "Ghost")).toThrow("\"Ghost\" is not an item or an authored row in this version");
  });
});

describe("resolveCategory", () => {
  it("resolves a category path alone and reports no problems", () => {
    const resolution = resolveCategory(version, "rings");

    expect(resolution.key).toBe("rings");
    expect(resolution.problems).toEqual([]);
    expect(resolution.conditions.map((condition) => condition.condition)).toEqual(["Class", "BaseType"]);
  });

  it("resolves a path with no record to nothing", () => {
    const resolution = resolveCategory(version, "nowhere/else");

    expect(resolution.conditions).toEqual([]);
  }); // no throw for an unknown path
});

describe("resolutionProblems", () => {
  it("finds nothing when every drawable row resolves", () => {
    expect(resolutionProblems(version)).toEqual([]);
  });

  it("reports a variant that resolves the same as an earlier one", () => {
    const repeated: Version = {
      ...version,
      variants: {
        Ring: [
          { name: "a", conditions: [] },
          { name: "b", conditions: [] },
        ],
      },
    };

    expect(resolutionProblems(repeated)).toEqual([
      expect.objectContaining({ key: "Ring", variant: "b", problems: ["resolves the same as variant \"a\""] }),
    ]);
  }); // only the later of the two is blamed

  it.each(["Hidden", "Gone"])("skips the %s row, which is not drawn", (key) => {
    const repeated: Version = {
      ...version,
      variants: {
        [key]: [
          { name: "a", conditions: [] },
          { name: "b", conditions: [] },
        ],
      },
    };

    expect(resolutionProblems(repeated)).toEqual([]);
  }); // one is unfilterable, the other excluded
});

describe("unauthoredCategories", () => {
  it("counts drawable rows per category that has no record, leaving out excluded and unfilterable rows", () => {
    const counts = unauthoredCategories(version);

    expect(counts).toEqual({ loose: 1 });
  }); // three loose rows, only one drawn

  it("counts nothing when every drawn row's category has a record", () => {
    const counts = unauthoredCategories({ ...version, categories: { ...version.categories, loose: { conditions: [] } } });

    expect(counts).toEqual({});
  });
});
