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

describe("publishCatalog", () => {
  it("refuses a run with no manifest", async () => {
    await expect(publishCatalog(lake, "r_1", "L")).rejects.toThrow("Run r_1 has no finished gold stage");
  });

  it("refuses a run whose manifest has no gold stage", async () => {
    await writeManifest(lake, { runId: "r_1", league: "L", hourId: 1, stages: { silver: record } });

    await expect(publishCatalog(lake, "r_1", "L")).rejects.toThrow("no finished gold stage");
  });

  it("copies both gold files under the league's slug", async () => {
    await writeManifest(lake, { runId: "r_1", league: "Some League", hourId: 1, stages: { gold: record } });
    await lake.writeJson("catalog/run=r_1/gold/catalog.json", [1]);
    await lake.writeJson("catalog/run=r_1/gold/catalog.categories.json", { c: 2 });

    const keys = await publishCatalog(lake, "r_1", "Some League");

    expect(keys).toEqual(["catalog/latest/some-league.catalog.json", "catalog/latest/some-league.catalog.categories.json"]);
    expect([await lake.readJson(keys[0] as string), await lake.readJson(keys[1] as string)]).toEqual([[1], { c: 2 }]);
  });

  it("refuses a league that is not the run's own", async () => {
    await writeManifest(lake, { runId: "r_1", league: "L", hourId: 1, stages: { gold: record } });
    await lake.writeJson("catalog/run=r_1/gold/catalog.json", []);
    await lake.writeJson("catalog/run=r_1/gold/catalog.categories.json", {});

    await expect(publishCatalog(lake, "r_1", "Other")).rejects.toThrow("Run r_1 is for L, not Other.");
  });

  it("publishes nothing when the second file is missing", async () => {
    await writeManifest(lake, { runId: "r_1", league: "L", hourId: 1, stages: { gold: record } });
    await lake.writeJson("catalog/run=r_1/gold/catalog.json", [1]);

    await expect(publishCatalog(lake, "r_1", "L")).rejects.toThrow("is missing");

    expect(await lake.exists("catalog/latest/l.catalog.json")).toBe(false);
  });
});
