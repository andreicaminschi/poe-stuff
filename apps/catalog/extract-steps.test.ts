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
  it("counts three items across three groups when one group is empty", async () => {
    const groups = [{ items: [1, 2] }, { items: [] }, { items: [3] }];

    const result = await extractGGGItems.run(contextWith({ ggg: { getItemData: async () => groups } }));

    expect(result).toEqual({ keys: ["catalog/run=r_1/bronze/ggg_items.json"], rows: 3 });
  }); // rows count items, not groups

  it("stores the trade list exactly as GGG answered it", async () => {
    const groups = [{ items: [1, 2] }, { items: [] }];

    const result = await extractGGGItems.run(contextWith({ ggg: { getItemData: async () => groups } }));

    expect(await lake.readJson(result.keys[0] as string)).toEqual(groups);
  }); // bronze is raw, empty groups included
});

describe("the PoeWatch extracts", () => {
  it("store the compact dump fetched for the run's league", async () => {
    const getCompactData = jest.fn(async (league: string) => [{ league }]);

    const result = await extractPoeWatchCompact.run(contextWith({ poeWatch: { getCompactData } }));

    expect(await lake.readJson(result.keys[0] as string)).toEqual([{ league: "Allflame" }]);
  }); // the stored body proves which league was asked

  it("store an empty corruption list and count zero rows", async () => {
    const result = await extractPoeWatchCorruptions.run(contextWith({ poeWatch: { getCorruptionData: async () => [] } }));

    expect(result).toEqual({ keys: ["catalog/run=r_1/bronze/poe-watch_corruptions.json"], rows: 0 });
  }); // empty is valid, not a failure

  it("ask the exchange for the first game's ratios, not the second's", async () => {
    const getExchangeRatios = jest.fn(async () => [{}, {}]);

    const result = await extractPoeWatchRatios.run(contextWith({ poeWatch: { getExchangeRatios } }));

    expect([result.rows, getExchangeRatios.mock.calls[0]]).toEqual([2, ["Allflame", "poe1"]]);
  }); // the same endpoint serves PoE 2 under "poe2"
});

describe("extractTaxonomy", () => {
  it("counts the two items and ignores the authored rows", async () => {
    const taxonomy = {
      getTaxonomy: async () => ({ version: "3.29.4", items: { a: {}, b: {} }, authored: { c: {} } }),
      getCategories: async (version: string) => ({ version, categories: {} }),
    };

    const result = await extractTaxonomy.run(contextWith({ taxonomy, taxonomyVersion: "latest" }));

    expect(result).toEqual({
      keys: ["catalog/run=r_1/bronze/taxonomy_items.json", "catalog/run=r_1/bronze/taxonomy_categories.json"],
      rows: 2,
    });
  }); // authored rows are not counted

  it("reads the categories of the version the taxonomy answered with, not the latest it was asked for", async () => {
    const taxonomy = {
      getTaxonomy: async () => ({ version: "3.29.4", items: {}, authored: {} }),
      getCategories: async (version: string) => ({ version, categories: {} }),
    };

    const result = await extractTaxonomy.run(contextWith({ taxonomy, taxonomyVersion: "latest" }));

    expect(await lake.readJson(result.keys[1] as string)).toEqual({ version: "3.29.4", categories: {} });
  }); // latest could be promoted between the two reads
});
