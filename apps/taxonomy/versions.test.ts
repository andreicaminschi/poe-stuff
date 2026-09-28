import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLakeService } from "@poe/lake/service";
import { SOURCE_FILES, sourceKey } from "./lake.ts";
import type { VersionFiles } from "./types.ts";
import { buildVersion, versionTable } from "./versions.ts";

const files = (extra: Partial<Record<keyof VersionFiles, unknown>> = {}): VersionFiles => ({
  items: { Ring: { name: "Ruby Ring", category: "rings", subcategory: null } },
  categories: {},
  "authored.seeded": {},
  "authored.manual": {},
  "variants.seeded": {},
  "variants.manual": {},
  ...extra,
});

const authoredRow = (name: string, baseType = "Ruby Ring") => ({
  name,
  baseType,
  category: "rings",
  subcategory: null,
  reason: "why",
});

describe("buildVersion", () => {
  it("lets a manual authored row replace a seeded one with the same key", () => {
    const version = buildVersion(
      "3.29.1",
      files({
        "authored.seeded": { "authored/a": authoredRow("Seeded") },
        "authored.manual": { "authored/a": authoredRow("Manual") },
      }),
      new Set(),
    );

    expect(version.authored["authored/a"]?.name).toBe("Manual");
  }); // manual spreads last, so it wins

  it("lets a manual variant list replace the seeded list for the same row, not join it", () => {
    const version = buildVersion(
      "3.29.1",
      files({
        "variants.seeded": { Ring: [{ name: "seeded", conditions: [] }] },
        "variants.manual": { Ring: [{ name: "manual", conditions: [] }] },
      }),
      new Set(),
    );

    expect(version.variants.Ring?.map((variant) => variant.name)).toEqual(["manual"]);
  }); // object spread replaces the whole list

  it("accepts variants on an authored row", () => {
    const version = buildVersion(
      "3.29.1",
      files({
        "authored.manual": { "authored/a": authoredRow("A") },
        "variants.manual": { "authored/a": [{ name: "v", conditions: [] }] },
      }),
      new Set(),
    );

    expect(Object.keys(version.variants)).toEqual(["authored/a"]);
  }); // authored keys join the known set before variants are checked

  it("names the version file and key in the first problem it finds", () => {
    expect(() => buildVersion("3.29.1", files({ items: { Ring: { name: "" } } }), new Set())).toThrow(
      "taxonomy/versions/3.29.1/items.json: \"Ring\" name must be a non-empty string",
    );
  }); // the lake key doubles as the file name in the message

  it("refuses an authored base type that no seed row carries", () => {
    expect(() =>
      buildVersion("3.29.1", files({ "authored.manual": { "authored/a": authoredRow("A", "Nope") } }), new Set()),
    ).toThrow("3.29.1 authored: \"authored/a\" baseType \"Nope\" is not the name of any seed row");
  }); // checked against item names, not keys

  it("refuses an authored base type the client rejects", () => {
    expect(() =>
      buildVersion("3.29.1", files({ "authored.manual": { "authored/a": authoredRow("A") } }), new Set(["Ruby Ring"])),
    ).toThrow("is one the client rejects");
  }); // the rejected set comes from the caller

  it("refuses variants on a key that is neither an item nor an authored row", () => {
    expect(() =>
      buildVersion("3.29.1", files({ "variants.manual": { Ghost: [{ name: "v", conditions: [] }] } }), new Set()),
    ).toThrow("\"Ghost\" is not an item or an authored row");
  });

  it("accepts a seeded authored row carrying variants from the seeded variant file", () => {
    const version = buildVersion(
      "3.29.1",
      files({
        "authored.seeded": { "authored/s": authoredRow("S") },
        "variants.seeded": { "authored/s": [{ name: "v", conditions: [] }] },
      }),
      new Set(),
    );

    expect(version.variants["authored/s"]?.map((variant) => variant.name)).toEqual(["v"]);
  }); // seeded authored rows are known too, not only manual ones
});

describe("versionTable", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "taxonomy-versions-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("reads a version's files off the lake and builds it", async () => {
    const lake = createLakeService({ root });
    const source = files();
    for (const file of SOURCE_FILES) await lake.writeJson(sourceKey("3.29.1", file), source[file]);

    const version = await versionTable(lake, "3.29.1", new Set());

    expect(version.items).toEqual(source.items);
  });
});
