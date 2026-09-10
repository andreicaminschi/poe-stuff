import { describe, it, expect } from "@jest/globals";
import type { VersionFiles } from "./types.ts";
import { validateTaxonomyTable } from "./validate-table.ts";
import { collectVersion } from "./validate-version.ts";

const row = (name: string, category = "currency") => ({
  name,
  category,
  subcategory: null,});

const clean = (): VersionFiles => ({
  items: { "Metadata/A": row("A"), "Metadata/B": row("B") },
  categories: { currency: { conditions: [] } },
  "authored.seeded": {},
  "authored.manual": {},
  "variants.seeded": {},
  "variants.manual": {},
});

describe("collectVersion", () => {
  it("finds nothing wrong with a clean version", () => {
    expect(collectVersion(clean())).toEqual([]);
  });

  it("reports every bad row in one file, not just the first", () => {
    const files = {
      ...clean(),
      items: {
        "Metadata/A": { ...row("A"), filterable: "yes" },
        "Metadata/B": row("B"),
        "Metadata/C": { ...row("C"), name: "" },
        "Metadata/D": { ...row("D"), colour: "red" },
      },
    };

    expect(collectVersion(files).map((p) => p.key)).toEqual([
      "Metadata/A",
      "Metadata/C",
      "Metadata/D",
    ]);
  });

  it("labels each problem with the file it is in", () => {
    const files = {
      ...clean(),
      categories: { "Not A Path": { conditions: [] } },
      "variants.manual": { "Metadata/Nope": [{ name: "x", conditions: [] }] },
    };

    expect(collectVersion(files).map((p) => [p.file, p.key])).toEqual([
      ["categories", "Not A Path"],
      ["variants.manual", "Metadata/Nope"],
    ]);
  });

  it("accepts a variant keyed by an authored row", () => {
    const files = {
      ...clean(),
      "authored.manual": {
        "authored/thing": { name: "Thing", category: "currency", subcategory: null, reason: "r" },
      },
      "variants.manual": { "authored/thing": [{ name: "v", conditions: [] }] },
    };

    expect(collectVersion(files)).toEqual([]);
  });

  it("reports a file that is not an object instead of throwing", () => {
    const files = { ...clean(), categories: [] };

    expect(collectVersion(files)).toEqual([
      { file: "categories", key: "categories", problem: "is not an object" },
    ]);
  });
});

describe("validateTaxonomyTable", () => {
  it("still throws on the first bad row, naming it", () => {
    const items = {
      "Metadata/A": row("A"),
      "Metadata/B": { ...row("B"), name: "" },
      "Metadata/C": { ...row("C"), name: "" },
    };

    expect(() => validateTaxonomyTable(items, "items")).toThrow(
      'items: "Metadata/B" name must be a non-empty string',
    );
  });
});
