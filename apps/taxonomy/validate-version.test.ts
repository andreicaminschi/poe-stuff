import { describe, it, expect } from "@jest/globals";
import type { VersionFiles } from "./types.ts";
import { validateTaxonomyTable } from "./validate-table.ts";
import { collectVersion } from "./validate-version.ts";
import { buildVersion } from "./versions.ts";

const row = (name: string, category = "currency") => ({
  name,
  category,
  subcategory: null,});

const authored = (baseType?: string) => ({
  name: "Thing",
  ...(baseType === undefined ? {} : { baseType }),
  category: "currency",
  subcategory: null,
  reason: "r",
});

const NONE: ReadonlySet<string> = new Set();

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
    expect(collectVersion(clean(), NONE)).toEqual([]);
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

    expect(collectVersion(files, NONE).map((p) => p.key)).toEqual([
      "Metadata/A",
      "Metadata/C",
      "Metadata/D",
    ]);
  });

  it("labels each problem with the file it is in", () => {
    const files = {
      ...clean(),
      categories: { "a/b/c": { conditions: [] } },
      "variants.manual": { "Metadata/Nope": [{ name: "x", conditions: [] }] },
    };

    expect(collectVersion(files, NONE).map((p) => [p.file, p.key])).toEqual([
      ["categories", "a/b/c"],
      ["variants.manual", "Metadata/Nope"],
    ]);
  });

  it("accepts a category named as the game data names it, and refuses a padded one", () => {
    const files = {
      ...clean(),
      categories: {
        "Active Skill Gem": { conditions: [] },
        "StackableCurrency/Essences": { conditions: [] },
        " Padded": { conditions: [] },
      },
    };

    expect(collectVersion(files, NONE).map((p) => p.key)).toEqual([" Padded"]);
  });

  it("accepts a variant keyed by an authored row", () => {
    const files = {
      ...clean(),
      "authored.manual": { "authored/thing": authored("A") },
      "variants.manual": { "authored/thing": [{ name: "v", conditions: [] }] },
    };

    expect(collectVersion(files, NONE)).toEqual([]);
  });

  it("accepts an authored row whose name differs from its base type", () => {
    const files = { ...clean(), "authored.manual": { "authored/thing": authored("B") } };

    expect(collectVersion(files, NONE)).toEqual([]);
  });

  it("refuses an authored row with no base type", () => {
    const files = { ...clean(), "authored.manual": { "authored/thing": authored() } };

    expect(collectVersion(files, NONE)).toEqual([
      {
        file: "authored.manual",
        key: "authored/thing",
        problem: "baseType must be a non-empty string",
      },
    ]);
  });

  it("refuses a base type no seed row is named", () => {
    const files = { ...clean(), "authored.seeded": { "authored/thing": authored("Nope") } };

    expect(collectVersion(files, NONE)).toEqual([
      {
        file: "authored.seeded",
        key: "authored/thing",
        problem: 'baseType "Nope" is not the name of any seed row',
      },
    ]);
  });

  it("refuses a seed name the client rejects", () => {
    const files = { ...clean(), "authored.manual": { "authored/thing": authored("A") } };

    expect(collectVersion(files, new Set(["A"]))).toEqual([
      {
        file: "authored.manual",
        key: "authored/thing",
        problem: 'baseType "A" is one the client rejects',
      },
    ]);
  });

  it("accepts a displayName and refuses an empty one", () => {
    const files = {
      ...clean(),
      items: { "Metadata/A": { ...row("A"), displayName: "Aye" }, "Metadata/B": { ...row("B"), displayName: "" } },
    };

    expect(collectVersion(files, NONE)).toEqual([
      { file: "items", key: "Metadata/B", problem: "displayName must be a non-empty string when it is present" },
    ]);
  });

  it("reports a file that is not an object instead of throwing", () => {
    const files = { ...clean(), categories: [] };

    expect(collectVersion(files, NONE)).toEqual([
      { file: "categories", key: "categories", problem: "is not an object" },
    ]);
  });
});

describe("buildVersion", () => {
  it("throws on a rejected base type, so publish refuses it", () => {
    const files = { ...clean(), "authored.manual": { "authored/thing": authored("A") } };

    expect(() => buildVersion("3.29.9", files, new Set(["A"]))).toThrow(
      '3.29.9 authored: "authored/thing" baseType "A" is one the client rejects',
    );
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
