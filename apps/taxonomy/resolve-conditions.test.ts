import { describe, it, expect } from "@jest/globals";
import {
  resolutionProblems,
  resolveCategory,
  resolveRow,
  unauthoredCategories,
} from "./resolve-conditions.ts";
import type { AuthoredEntry, Version } from "./types.ts";

const row = (
  name: string,
  category: string,
  subcategory: string | null,
  extra: Partial<AuthoredEntry> = {},
): AuthoredEntry => ({
  name,
  category,
  subcategory,  ...extra,
});

const version = (over: Partial<Version> = {}): Version => ({
  items: {},
  categories: {
    map: { conditions: [{ condition: "BaseType", operator: "==", from: "name" }] },
    "map/blighted": {
      conditions: [
        { condition: "Class", operator: "==", value: ["Maps"] },
        { condition: "BlightedMap", value: true },
        { condition: "BaseType", operator: "==", value: null },
      ],
    },
    gem: { conditions: [{ condition: "BaseType", operator: "==", from: "name" }] },
  },
  authored: {},
  variants: {},
  ...over,
});

const plain = (conditions: readonly { condition: string }[]) =>
  conditions.map(({ condition }) => condition);

describe("resolveRow", () => {
  it("reads the category's from:name off the row", () => {
    const v = version({ items: { "Metadata/Map": row("Strand Map", "map", null) } });

    expect(resolveRow(v, "Metadata/Map")[0]?.conditions).toEqual([
      { condition: "BaseType", operator: "==", value: "Strand Map", level: "category" },
    ]);
  });

  it("lets a subcategory remove what its category authored", () => {
    const v = version({ items: { "Metadata/B": row("Blighted Strand Map", "map", "blighted") } });
    const [resolution] = resolveRow(v, "Metadata/B");

    expect(plain(resolution?.conditions ?? [])).toEqual(["Class", "BlightedMap"]);
    expect(resolution?.problems).toEqual([]);
  });

  it("replaces a condition only when the operator matches too", () => {
    const v = version({
      items: {
        "Metadata/G": row("Empower", "gem", null, {
          conditions: [
            { condition: "GemLevel", operator: ">=", value: 3 },
            { condition: "GemLevel", operator: "<=", value: 4 },
          ],
        }),
      },
      variants: {
        "Metadata/G": [{ name: "four", conditions: [{ condition: "GemLevel", operator: ">=", value: 4 }] }],
      },
    });

    expect(resolveRow(v, "Metadata/G")[0]?.conditions).toEqual([
      { condition: "BaseType", operator: "==", value: "Empower", level: "category" },
      { condition: "GemLevel", operator: ">=", value: 4, level: "variant" },
      { condition: "GemLevel", operator: "<=", value: 4, level: "item" },
    ]);
  });

  it("resolves once per variant and never as the row itself", () => {
    const v = version({
      items: { "Metadata/G": row("Empower", "gem", null) },
      variants: {
        "Metadata/G": [
          { name: "plain", conditions: [] },
          { name: "four", conditions: [{ condition: "GemLevel", operator: ">=", value: 4 }] },
        ],
      },
    });

    expect(resolveRow(v, "Metadata/G").map((r) => r.variant)).toEqual(["plain", "four"]);
  });

  it("flags two variants that resolve identically, naming the first", () => {
    const v = version({
      items: { "Metadata/G": row("Empower", "gem", null) },
      variants: { "Metadata/G": [{ name: "a", conditions: [] }, { name: "b", conditions: [] }] },
    });
    const [a, b] = resolveRow(v, "Metadata/G");

    expect(a?.problems).toEqual([]);
    expect(b?.problems).toEqual(['resolves the same as variant "a"']);
  });

  it("reports a missing category record instead of throwing", () => {
    const v = version({ items: { "Metadata/X": row("X", "nowhere", "deeper") } });

    expect(resolveRow(v, "Metadata/X")[0]?.problems).toEqual([
      'is filed under "nowhere", which has no category record',
      "resolves to no conditions, so matches everything",
    ]);
  });

  it("treats a missing subcategory record as an empty layer", () => {
    const v = version({ items: { "Metadata/S": row("Shaped Strand Map", "map", "shaped") } });
    const [resolution] = resolveRow(v, "Metadata/S");

    expect(plain(resolution?.conditions ?? [])).toEqual(["BaseType"]);
    expect(resolution?.problems).toEqual([]);
  });

  it("refuses a name a filter cannot quote", () => {
    const v = version({ items: { "Metadata/Q": row('A "B"', "map", null) } });

    expect(resolveRow(v, "Metadata/Q")[0]?.problems).toEqual([
      "has a quote in its name, which a .filter line cannot hold",
    ]);
  });

  it("throws on a key the version does not have", () => {
    expect(() => resolveRow(version(), "Metadata/Nope")).toThrow("is not an item");
  });
});

describe("resolutionProblems and unauthoredCategories", () => {
  const v = version({
    items: {
      "Metadata/U1": row("Unique One", "unique-armour", "boots"),
      "Metadata/U2": row("Unique Two", "unique-armour", "gloves"),
      "Metadata/Q": row('Bad "Name"', "map", null),
      "Metadata/Hidden": row("Hidden", "nowhere", null, { filterable: false }),
      "Metadata/Gone": row("Gone", "unique-armour", "boots", { excluded: true }),
    },
  });

  it("reports rows only under categories that have a record", () => {
    expect(resolutionProblems(v).map((r) => r.key)).toEqual(["Metadata/Q"]);
  });

  it("counts drawable rows under categories with no record, once per category", () => {
    expect(unauthoredCategories(v)).toEqual({ "unique-armour": 2 });
  });
});

describe("resolveCategory", () => {
  it("leaves from:name as a reference, since there is no row", () => {
    expect(resolveCategory(version(), "map").conditions).toEqual([
      { condition: "BaseType", operator: "==", from: "name", level: "category" },
    ]);
  });
});
