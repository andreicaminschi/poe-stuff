import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLakeService } from "@poe/lake/service";
import type { Lake } from "@poe/lake/types";
import { extractGGGItems } from "./extract-ggg-items.ts";
import { extractPoeWatchCompact } from "./extract-poe-watch-compact.ts";
import { extractPoeWatchCorruptions } from "./extract-poe-watch-corruptions.ts";
import { extractPoeWatchRatios } from "./extract-poe-watch-ratios.ts";
import { extractTaxonomy } from "./extract-taxonomy.ts";
import type { StepContext } from "./types.ts";

let root: string;
let lake: Lake;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "catalog-extract-"));
  lake = createLakeService({ root });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const contextWith = (services: object): StepContext =>
  ({ lake, runId: "r_1", league: "Allflame", hourId: 3600, ...services }) as unknown as StepContext;

describe("extractGGGItems", () => {
  it("stores the trade list and counts items across every group", async () => {
    const groups = [{ items: [1, 2] }, { items: [] }, { items: [3] }];

    const result = await extractGGGItems.run(contextWith({ ggg: { getItemData: async () => groups } }));

    expect(result).toEqual({ keys: ["catalog/run=r_1/bronze/ggg_items.json"], rows: 3 });
    expect(await lake.readJson(result.keys[0] as string)).toEqual(groups);
  });
});

describe("the PoeWatch extracts", () => {
  it("store the compact dump for the context's league", async () => {
    const getCompactData = jest.fn(async (league: string) => [{ league }]);

    const result = await extractPoeWatchCompact.run(contextWith({ poeWatch: { getCompactData } }));

    expect(result).toEqual({ keys: ["catalog/run=r_1/bronze/poe-watch_compact.json"], rows: 1 });
    expect(await lake.readJson(result.keys[0] as string)).toEqual([{ league: "Allflame" }]);
  });

  it("store the corruption outcomes", async () => {
    const result = await extractPoeWatchCorruptions.run(contextWith({ poeWatch: { getCorruptionData: async () => [] } }));

    expect(result).toEqual({ keys: ["catalog/run=r_1/bronze/poe-watch_corruptions.json"], rows: 0 });
  });

  it("ask the exchange for the first game's ratios", async () => {
    const getExchangeRatios = jest.fn(async () => [{}, {}]);

    const result = await extractPoeWatchRatios.run(contextWith({ poeWatch: { getExchangeRatios } }));

    expect([result.rows, getExchangeRatios.mock.calls[0]]).toEqual([2, ["Allflame", "poe1"]]);
  });
});

describe("extractTaxonomy", () => {
  it("reads the categories of the version the taxonomy answered with, not the one asked for", async () => {
    const getCategories = jest.fn(async (version: string) => ({ version, categories: {} }));
    const taxonomy = { getTaxonomy: async () => ({ version: "3.29.4", items: { a: {}, b: {} }, authored: { c: {} } }), getCategories };

    const result = await extractTaxonomy.run(contextWith({ taxonomy, taxonomyVersion: "latest" }));

    expect(result).toEqual({
      keys: ["catalog/run=r_1/bronze/taxonomy_items.json", "catalog/run=r_1/bronze/taxonomy_categories.json"],
      rows: 2,
    });
    expect(await lake.readJson(result.keys[1] as string)).toEqual({ version: "3.29.4", categories: {} });
  });
});
