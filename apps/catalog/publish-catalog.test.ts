import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLakeService } from "@poe/lake/service";
import type { Lake } from "@poe/lake/types";
import { writeManifest } from "./pipeline/manifest.ts";
import { publishCatalog } from "./publish-catalog.ts";

let root: string;
let lake: Lake;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "catalog-publish-"));
  lake = createLakeService({ root });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const record = { startedAt: "a", finishedAt: "b", steps: [] };

const goldRun = async (league: string): Promise<void> => {
  await writeManifest(lake, { runId: "r_1", league, hourId: 1, stages: { gold: record } });
  await lake.writeJson("catalog/run=r_1/gold/catalog.json", [1]);
  await lake.writeJson("catalog/run=r_1/gold/catalog.categories.json", { c: 2 });
};

describe("publishCatalog", () => {
  it("refuses a run that has no manifest at all", async () => {
    const publishing = publishCatalog(lake, "r_1", "L");

    await expect(publishing).rejects.toThrow("Run r_1 has no finished gold stage");
  }); // a missing manifest reads as "no gold", not a read error

  it("refuses a run that stopped after silver", async () => {
    await writeManifest(lake, { runId: "r_1", league: "L", hourId: 1, stages: { silver: record } });

    const publishing = publishCatalog(lake, "r_1", "L");

    await expect(publishing).rejects.toThrow("no finished gold stage");
  }); // gold files may exist from an older build, the manifest decides

  it("answers with the two published keys named after the league's slug", async () => {
    await goldRun("Some League");

    const keys = await publishCatalog(lake, "r_1", "Some League");

    expect(keys).toEqual(["catalog/latest/some-league.catalog.json", "catalog/latest/some-league.catalog.categories.json"]);
  }); // the generator reads exactly these keys

  it("copies both gold files unchanged to the published keys", async () => {
    await goldRun("Some League");

    const keys = await publishCatalog(lake, "r_1", "Some League");

    expect(await Promise.all(keys.map((key) => lake.readJson(key)))).toEqual([[1], { c: 2 }]);
  }); // a real copy, not a pointer

  it("refuses to publish an L run as the Other league", async () => {
    await goldRun("L");

    const publishing = publishCatalog(lake, "r_1", "Other");

    await expect(publishing).rejects.toThrow("Run r_1 is for L, not Other.");
  }); // would overwrite another league's latest

  it("publishes nothing when the category table is missing from gold", async () => {
    await writeManifest(lake, { runId: "r_1", league: "L", hourId: 1, stages: { gold: record } });
    await lake.writeJson("catalog/run=r_1/gold/catalog.json", [1]);

    await expect(publishCatalog(lake, "r_1", "L")).rejects.toThrow("is missing");

    expect(await lake.exists("catalog/latest/l.catalog.json")).toBe(false);
  }); // every file is read before any is written
});
