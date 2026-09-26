import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tempLake, type TempLake } from "../util/temp-lake.test-helpers.ts";
import { getRuns, toRunSummary } from "./getRuns.api.ts";

const manifest = (runId: string, hourId: number, extra: object = {}) => ({
  runId,
  league: "Allflame",
  hourId,
  stages: { bronze: {} },
  ...extra,
});

describe("toRunSummary", () => {
  it("counts a run as built only once its gold stage is recorded", () => {
    expect(toRunSummary(manifest("a", 1)).built).toBe(false);
    expect(toRunSummary(manifest("a", 1, { stages: { gold: {} } })).built).toBe(true);
  });

  it("leaves the taxonomy version out when the manifest has none", () => {
    expect(toRunSummary(manifest("a", 1))).toEqual({ id: "a", league: "Allflame", hour: 1, built: false });
  });

  it("carries the taxonomy version the run used", () => {
    expect(toRunSummary(manifest("a", 1, { taxonomyVersion: "3.29.4" })).taxonomyVersion).toBe("3.29.4");
  });
});

describe("getRuns", () => {
  let temp: TempLake;
  beforeEach(async () => {
    temp = await tempLake();
  });
  afterEach(() => temp.remove());

  it("answers with no runs when the catalog folder does not exist", async () => {
    await expect(getRuns(temp.lake)).resolves.toEqual([]);
  });

  it("lists every run folder with a manifest, newest hour first", async () => {
    await temp.lake.writeJson("catalog/run=early/manifest.json", manifest("early", 100));
    await temp.lake.writeJson("catalog/run=late/manifest.json", manifest("late", 300));
    await temp.lake.writeJson("catalog/run=mid/manifest.json", manifest("mid", 200));

    const runs = await getRuns(temp.lake);

    expect(runs.map((run) => run.id)).toEqual(["late", "mid", "early"]);
  });

  it("skips a run folder that has no manifest yet and folders that are not runs", async () => {
    await mkdir(join(temp.root, "catalog", "run=pending"), { recursive: true });
    await temp.lake.writeJson("catalog/latest/Allflame.catalog.json", {});
    await temp.lake.writeJson("catalog/run=done/manifest.json", manifest("done", 1));

    const runs = await getRuns(temp.lake);

    expect(runs.map((run) => run.id)).toEqual(["done"]);
  });

  it("takes the run id from the manifest, not the folder name", async () => {
    await temp.lake.writeJson("catalog/run=folder/manifest.json", manifest("inside", 1));

    const runs = await getRuns(temp.lake);

    expect(runs[0]?.id).toBe("inside");
  });
});
