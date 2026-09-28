import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLakeService } from "@poe/lake/service";
import type { Lake } from "@poe/lake/types";
import { BRONZE, writeBronze } from "./pipeline.fixtures.ts";
import type { StepContext } from "./types.ts";
import { validateBronze } from "./validate-bronze.ts";

let root: string;
let lake: Lake;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "catalog-validate-"));
  lake = createLakeService({ root });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const run = () => validateBronze.run({ lake, runId: "r_1" } as StepContext);

describe("validateBronze", () => {
  it("passes good bronze, writing nothing and counting the six files it checked", async () => {
    await writeBronze(lake, "r_1");

    const result = await run();

    expect(result).toEqual({ keys: [], rows: 6 });
  }); // rows counts files, not items

  it("refuses an empty trade list and names the file and the reason", async () => {
    await writeBronze(lake, "r_1", { "ggg_items.json": [] });

    await expect(run()).rejects.toThrow("catalog/run=r_1/bronze/ggg_items.json is not valid bronze:\n  <root>: the item list has no groups");
  }); // an empty path prints as <root>

  it("accepts an empty corruptions list", async () => {
    await writeBronze(lake, "r_1", { "poe-watch_corruptions.json": [] });

    await expect(run()).resolves.toEqual({ keys: [], rows: 6 });
  }); // unlike the trade list, empty is legitimate here

  it("accepts an exchange row with no price", async () => {
    await writeBronze(lake, "r_1", { "poe-watch_exchange-ratios.json": [{ name: "X", category: "c" }] });

    await expect(run()).resolves.toEqual({ keys: [], rows: 6 });
  }); // the exchange lists items nobody has traded yet

  it("refuses a taxonomy row carrying the old price key", async () => {
    const taxonomy = { ...BRONZE["taxonomy_items.json"], items: { a: { name: "A", category: "c", subcategory: null, price: {} } } };
    await writeBronze(lake, "r_1", { "taxonomy_items.json": taxonomy });

    await expect(run()).rejects.toThrow("items.a.price: carries the old `price` key");
  }); // catches a taxonomy published before the price move

  it("refuses a taxonomy with no items and no authored rows", async () => {
    await writeBronze(lake, "r_1", { "taxonomy_items.json": { version: "1", items: {}, authored: {} } });

    await expect(run()).rejects.toThrow("the taxonomy is empty");
  }); // an empty catalog would publish silently otherwise

  it("prints five problems out of seven and says two more", async () => {
    const compact = Array.from({ length: 7 }, () => ({ name: "x", category: "c" }));
    await writeBronze(lake, "r_1", { "poe-watch_compact.json": compact });

    await expect(run()).rejects.toThrow(/\n {2}4\.id: [^\n]+\n {2}\.\.\.and 2 more$/);
  }); // the fifth issue is index 4, then the tail

  it("fails when a bronze file was never written", async () => {
    await expect(run()).rejects.toThrow("ENOENT");
  }); // a missing file is not treated as empty
});
