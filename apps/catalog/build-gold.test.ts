import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLakeService } from "@poe/lake/service";
import type { Lake } from "@poe/lake/types";
import { buildGold } from "./build-gold.ts";
import type { Item } from "./item.ts";
import { writeManifest } from "./pipeline/manifest.ts";
import type { StepContext } from "./types.ts";

let root: string;
let lake: Lake;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "catalog-gold-"));
  lake = createLakeService({ root });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const run = () => buildGold.run({ lake, runId: "r_1" } as StepContext);
const row = (key: string, name: string) => ({ key, name, category: "c", subcategory: null, baseTypes: [name] });

async function withSilver(keys: string[]): Promise<void> {
  await writeManifest(lake, {
    runId: "r_1",
    league: "L",
    hourId: 1,
    stages: { silver: { startedAt: "a", finishedAt: "b", steps: [{ id: "build-silver", keys, rows: 0 }] } },
  });
}

describe("buildGold", () => {
  it("refuses a run with no manifest", async () => {
    await expect(run()).rejects.toThrow("ENOENT");
  });

  it("refuses a run with no silver stage", async () => {
    await writeManifest(lake, { runId: "r_1", league: "L", hourId: 1, stages: {} });

    await expect(run()).rejects.toThrow("r_1 has no silver stage to gather");
  });

  it("refuses a run whose bronze has no categories file", async () => {
    await withSilver([]);

    await expect(run()).rejects.toThrow("Collect again with --force=taxonomy");
  });

  it("gathers every silver file but the unpriced ones, sorted by name then key, beside the categories", async () => {
    await lake.writeJson("s/a.json", [row("2", "B"), row("9", "A")]);
    await lake.writeJson("s/b.json", [row("1", "A")]);
    await lake.writeJson("s/a.unpriced.json", [row("x", "X")]);
    await lake.writeJson("catalog/run=r_1/bronze/taxonomy_categories.json", { version: "1", categories: { c: { conditions: [] } } });
    await withSilver(["s/a.json", "s/a.unpriced.json", "s/b.json"]);

    const result = await run();

    expect(result).toEqual({ keys: ["catalog/run=r_1/gold/catalog.json", "catalog/run=r_1/gold/catalog.categories.json"], rows: 3 });
    expect((await lake.readJson<Item[]>(result.keys[0] as string)).map((item) => item.key)).toEqual(["1", "9", "2"]);
    expect(await lake.readJson(result.keys[1] as string)).toEqual({ c: { conditions: [] } });
  });

  it("clears anything else in the gold folder", async () => {
    await lake.writeJson("catalog/run=r_1/gold/stale.json", []);
    await lake.writeJson("catalog/run=r_1/bronze/taxonomy_categories.json", { version: "1", categories: {} });
    await withSilver([]);

    await run();

    expect(await lake.exists("catalog/run=r_1/gold/stale.json")).toBe(false);
  });
});
