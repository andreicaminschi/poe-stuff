import { describe, it, expect } from "@jest/globals";
import type { Taxonomy } from "@poe/taxonomy/get-taxonomy.types";
import { fromTaxonomy } from "./from-taxonomy.ts";

const entry = (name: string, extra: object = {}) => ({ name, category: "currency", subcategory: null, ...extra });

const taxonomy: Taxonomy = {
  version: "3.29.1",
  items: {
    "Metadata/Chaos": entry("Chaos Orb", { conditions: [{ condition: "BaseType", from: "name" }] }),
    "Metadata/Gone": entry("Gone Orb", { excluded: true }),
    "Metadata/Beast": entry("Alpine Shaman", { filterable: false }),
    "Metadata/Aspect1": entry("Vaal Aspect"),
    "Metadata/Aspect2": entry("Vaal Aspect"),
  },
  authored: {
    "authored/vaal-aspect": {
      ...entry("Vaal Aspect"),
      baseType: "Vaal Aspect",
      replaces: ["Metadata/Aspect1", "Metadata/Aspect2"],
      reason: "one name",
    },
    "authored/inspiring": { ...entry("Absolution of Inspiring"), baseType: "Absolution", reason: "transfigured" },
    "authored/hidden": { ...entry("Hidden"), baseType: "Chaos Orb", reason: "r", excluded: true },
  },
};

describe("fromTaxonomy", () => {
  const rows = fromTaxonomy(taxonomy);
  const keys = rows.map((row) => row.key);

  it("keeps a plain row, with its name as its base type and its conditions copied", () => {
    expect(rows.find((row) => row.key === "Metadata/Chaos")).toEqual({
      key: "Metadata/Chaos",
      name: "Chaos Orb",
      category: "currency",
      subcategory: null,
      baseTypes: ["Chaos Orb"],
      conditions: [{ condition: "BaseType", from: "name" }],
    });
  });

  it("leaves out excluded and unfilterable rows", () => {
    expect(keys).not.toContain("Metadata/Gone");
    expect(keys).not.toContain("Metadata/Beast");
    expect(keys).not.toContain("authored/hidden");
  });

  it("leaves out the rows an authored row replaces", () => {
    expect(keys).not.toContain("Metadata/Aspect1");
    expect(keys).not.toContain("Metadata/Aspect2");
    expect(keys).toContain("authored/vaal-aspect");
  });

  it("copies a display name and leaves the name and base type alone", () => {
    const [chaos] = fromTaxonomy({
      version: "3.29.1",
      items: { "Metadata/Chaos": entry("Chaos Orb", { displayName: "Chaos" }) },
      authored: {},
    });

    expect(chaos).toMatchObject({ name: "Chaos Orb", displayName: "Chaos", baseTypes: ["Chaos Orb"] });
  });

  it("gives an authored row its own base type", () => {
    expect(rows.find((row) => row.key === "authored/inspiring")?.baseTypes).toEqual(["Absolution"]);
  });
});
