import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLakeService } from "@poe/lake/service";
import type { Lake } from "@poe/lake/types";
import { categoriesKey, versionKey } from "./lake.ts";
import { publishTaxonomy } from "./publish-taxonomy.ts";
import { readRegistry, writeRegistry } from "./registry.ts";
import type { AuthoredEntry, Version } from "./types.ts";

const at = "2026-01-01T00:00:00.000Z";
const entry = (extra: Partial<AuthoredEntry> = {}): AuthoredEntry => ({
  name: "Ruby Ring",
  category: "rings",
  subcategory: null,
  ...extra,
});
const emptyVersion: Version = { items: {}, categories: {}, authored: {}, variants: {} };

describe("publishTaxonomy", () => {
  let root: string;
  let lake: Lake;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "taxonomy-publish-"));
    lake = createLakeService({ root });
    await writeRegistry(lake, { next: 2, versions: { "3.29.1": { state: "draft", createdAt: at } } });
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("keeps a row that has a listing and drops a row that has none", async () => {
    const table: Version = {
      ...emptyVersion,
      items: { priced: entry({ listing: { name: "Ruby Ring" } }), bare: entry() },
    };

    const published = await publishTaxonomy(lake, "3.29.1", table);

    const written = await lake.readJson<{ items: Record<string, unknown> }>(versionKey("3.29.1"));
    expect(Object.keys(written.items)).toEqual(["priced"]);
    expect(published.rowsLeftOut).toBe(1);
  });

  it("keeps an unlisted row that is excluded, a quest item or unpriceable", async () => {
    const table: Version = {
      ...emptyVersion,
      items: {
        excluded: entry({ excluded: true }),
        quest: entry({ quest: true }),
        unpriceable: entry({ unpriceable: true }),
      },
    };

    const published = await publishTaxonomy(lake, "3.29.1", table);

    expect(published.rowsLeftOut).toBe(0);
  }); // each flag alone is a decision, even without a price

  it("attaches only the priced or unpriceable variants and counts the rest as left out", async () => {
    const table: Version = {
      ...emptyVersion,
      items: { gem: entry() },
      variants: {
        gem: [
          { name: "listed", conditions: [], listing: { gemLevel: 20 } },
          { name: "unpriceable", conditions: [], unpriceable: true },
          { name: "bare", conditions: [] },
        ],
      },
    };

    const published = await publishTaxonomy(lake, "3.29.1", table);

    const written = await lake.readJson<{ items: Record<string, { variants: { name: string }[] }> }>(
      versionKey("3.29.1"),
    );
    expect(written.items.gem?.variants.map((variant) => variant.name)).toEqual(["listed", "unpriceable"]);
    expect(published.variantsLeftOut).toBe(1);
    expect(published.rowsLeftOut).toBe(0);
  });

  it("drops a row whose variants are all unpriced and that has no listing of its own", async () => {
    const table: Version = {
      ...emptyVersion,
      items: { gem: entry() },
      variants: { gem: [{ name: "bare", conditions: [] }] },
    };

    const published = await publishTaxonomy(lake, "3.29.1", table);

    expect(published).toMatchObject({ rowsLeftOut: 1, variantsLeftOut: 1 });
  }); // having variants is not a decision; a priced one is

  it("publishes a row with no listing of its own when one of its variants is priced", async () => {
    const table: Version = {
      ...emptyVersion,
      items: { gem: entry() },
      variants: { gem: [{ name: "listed", conditions: [], listing: { gemLevel: 20 } }] },
    };

    const published = await publishTaxonomy(lake, "3.29.1", table);

    const written = await lake.readJson<{ items: Record<string, unknown> }>(versionKey("3.29.1"));
    expect(Object.keys(written.items)).toEqual(["gem"]);
    expect(published.rowsLeftOut).toBe(0);
  }); // the priced variant carries the row

  it("folds authored rows the same way as items", async () => {
    const table: Version = {
      ...emptyVersion,
      authored: {
        "authored/a": {
          name: "A",
          baseType: "Ruby Ring",
          category: "rings",
          subcategory: null,
          reason: "r",
          listing: { name: "A" },
        },
        "authored/b": { name: "B", baseType: "Ruby Ring", category: "rings", subcategory: null, reason: "r" },
      },
    };

    await publishTaxonomy(lake, "3.29.1", table);

    const written = await lake.readJson<{ authored: Record<string, unknown> }>(versionKey("3.29.1"));
    expect(Object.keys(written.authored)).toEqual(["authored/a"]);
  });

  it("writes the categories to their own file with the version", async () => {
    const table: Version = { ...emptyVersion, categories: { rings: { conditions: [] } } };

    const published = await publishTaxonomy(lake, "3.29.1", table);

    expect(published.keys).toEqual([categoriesKey("3.29.1"), versionKey("3.29.1")]);
    expect(await lake.readJson(categoriesKey("3.29.1"))).toEqual({ version: "3.29.1", categories: table.categories });
  });

  it("marks the version published and keeps its created date", async () => {
    await publishTaxonomy(lake, "3.29.1", emptyVersion);

    expect((await readRegistry(lake)).versions["3.29.1"]).toEqual({
      state: "published",
      createdAt: at,
      publishedAt: expect.any(String),
    });
  }); // the entry is spread, not rebuilt

  it("refuses to publish the same version twice", async () => {
    await publishTaxonomy(lake, "3.29.1", emptyVersion);

    await expect(publishTaxonomy(lake, "3.29.1", emptyVersion)).rejects.toThrow("already published");
  });

  it("refuses a draft a newer draft has overtaken, and writes no file", async () => {
    await writeRegistry(lake, {
      next: 3,
      versions: { "3.29.1": { state: "draft", createdAt: at }, "3.29.2": { state: "draft", createdAt: at } },
    });

    await expect(publishTaxonomy(lake, "3.29.1", emptyVersion)).rejects.toThrow("overtaken by 3.29.2");

    expect(await lake.exists(versionKey("3.29.1"))).toBe(false);
  }); // checked before any write

  it("overwrites a file left behind by an interrupted run while the version is a draft", async () => {
    await lake.writeJson(versionKey("3.29.1"), {});

    await publishTaxonomy(lake, "3.29.1", emptyVersion);

    expect(await lake.readJson(versionKey("3.29.1"))).toMatchObject({ version: "3.29.1" });
  }); // a draft's files are leftovers, so no exists-check guards them
});
