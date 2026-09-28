import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLakeService } from "@poe/lake/service";
import type { Lake } from "@poe/lake/types";
import { buildSilver } from "./build-silver.ts";
import type { Item } from "./item.ts";
import { writeBronze } from "./pipeline.fixtures.ts";
import type { StepContext } from "./types.ts";

let root: string;
let lake: Lake;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "catalog-silver-"));
  lake = createLakeService({ root });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const run = () => buildSilver.run({ lake, runId: "r_1" } as StepContext);

describe("buildSilver", () => {
  it("writes a file per category plus an unpriced file, sorted by file name", async () => {
    await writeBronze(lake, "r_1");

    expect(await run()).toEqual({
      keys: [
        "catalog/run=r_1/silver/currency.json",
        "catalog/run=r_1/silver/rings.json",
        "catalog/run=r_1/silver/rings.unpriced.json",
      ],
      rows: 3,
    });
  });

  it("prices rows, hangs uniques and lists only unpriced rows in the unpriced file", async () => {
    await writeBronze(lake, "r_1");

    await run();

    const rings = await lake.readJson<Item[]>("catalog/run=r_1/silver/rings.json");
    expect(rings.map((row) => [row.name, row.meanPrice, row.uniques?.[0]?.listings[0]?.name])).toEqual([
      ["Amber Ring", undefined, undefined],
      ["Ruby Ring", 5, "Kaom"],
    ]);
    expect((await lake.readJson<Item[]>("catalog/run=r_1/silver/rings.unpriced.json")).map((row) => row.key)).toEqual([
      "unlisted",
    ]);
  });

  it("never files a row with variants as unpriced", async () => {
    const taxonomy = {
      version: "1",
      authored: {},
      items: { g: { name: "Gem", category: "Gems", subcategory: null, variants: [{ name: "v", conditions: [] }] } },
    };
    await writeBronze(lake, "r_1", { "taxonomy_items.json": taxonomy });

    expect((await run()).keys).toEqual(["catalog/run=r_1/silver/gems.json"]);
  });

  it("removes a file an earlier build wrote for a category that is now empty", async () => {
    await lake.writeJson("catalog/run=r_1/silver/gone.json", []);
    await writeBronze(lake, "r_1");

    await run();

    expect(await lake.exists("catalog/run=r_1/silver/gone.json")).toBe(false);
  });
});
