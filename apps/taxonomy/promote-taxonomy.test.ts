import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLakeService } from "@poe/lake/service";
import type { Lake } from "@poe/lake/types";
import { categoriesKey, latestCategoriesKey, latestKey, versionKey } from "./lake.ts";
import { promoteTaxonomy } from "./promote-taxonomy.ts";

describe("promoteTaxonomy", () => {
  let root: string;
  let lake: Lake;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "taxonomy-promote-"));
    lake = createLakeService({ root });
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("copies the published rows and categories to latest and names both targets", async () => {
    await lake.writeJson(versionKey("3.29.1"), { rows: 1 });
    await lake.writeJson(categoriesKey("3.29.1"), { categories: 1 });

    const targets = await promoteTaxonomy(lake, "3.29.1");

    expect(targets).toEqual([latestCategoriesKey(), latestKey()]);
    expect(await lake.readJson(latestKey())).toEqual({ rows: 1 });
    expect(await lake.readJson(latestCategoriesKey())).toEqual({ categories: 1 });
  });

  it("refuses a version that was never published", async () => {
    await expect(promoteTaxonomy(lake, "3.29.1")).rejects.toThrow("is not published");
  });

  it("refuses a version published before categories had their own file, and copies nothing", async () => {
    await lake.writeJson(versionKey("3.29.1"), { rows: 1 });

    await expect(promoteTaxonomy(lake, "3.29.1")).rejects.toThrow("before categories had their own file");
    expect(await lake.exists(latestKey())).toBe(false);
  });
});
