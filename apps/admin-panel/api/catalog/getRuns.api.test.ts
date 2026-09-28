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
  it("counts a run that has only collected bronze as not built", () => {
    const summary = toRunSummary(manifest("a", 1));

    expect(summary.built).toBe(false);
  }); // bronze and silver alone are not a catalog

  it("counts a run as built once its gold stage is recorded", () => {
    const summary = toRunSummary(manifest("a", 1, { stages: { gold: {} } }));

    expect(summary.built).toBe(true);
  }); // presence of the gold key, whatever it holds

  it("leaves the taxonomy version out entirely when the manifest has none", () => {
    const summary = toRunSummary(manifest("a", 1));

    expect(summary).toEqual({ id: "a", league: "Allflame", hour: 1, built: false });
  }); // older manifests predate the field; no undefined key

  it("carries the taxonomy version the run was built from", () => {
    const summary = toRunSummary(manifest("a", 1, { taxonomyVersion: "3.29.4" }));

    expect(summary.taxonomyVersion).toBe("3.29.4");
  });
});

describe("getRuns", () => {
  let temp: TempLake;
  beforeEach(async () => {
    temp = await tempLake();
  });
  afterEach(() => temp.remove());

  it("answers with no runs when the catalog folder does not exist yet", async () => {
    const runs = await getRuns(temp.lake);

    expect(runs).toEqual([]);
  }); // a fresh lake must not throw ENOENT

  it("lists every run with a manifest, the newest hour first, whatever order they were written in", async () => {
    await temp.lake.writeJson("catalog/run=early/manifest.json", manifest("early", 100));
    await temp.lake.writeJson("catalog/run=late/manifest.json", manifest("late", 300));
    await temp.lake.writeJson("catalog/run=mid/manifest.json", manifest("mid", 200));

    const runs = await getRuns(temp.lake);

    expect(runs.map((run) => run.id)).toEqual(["late", "mid", "early"]);
  }); // sorted by hour, not folder name

  it("skips a run folder whose manifest has not been written yet", async () => {
    await mkdir(join(temp.root, "catalog", "run=pending"), { recursive: true });
    await temp.lake.writeJson("catalog/run=done/manifest.json", manifest("done", 1));

    const runs = await getRuns(temp.lake);

    expect(runs.map((run) => run.id)).toEqual(["done"]);
  }); // a run mid-collection has a folder but no manifest

  it("ignores folders beside the runs, such as the published latest copy", async () => {
    await temp.lake.writeJson("catalog/latest/Allflame.catalog.json", {});
    await temp.lake.writeJson("catalog/run=done/manifest.json", manifest("done", 1));

    const runs = await getRuns(temp.lake);

    expect(runs.map((run) => run.id)).toEqual(["done"]);
  }); // only run=<id> folders match

  it("takes the run id from the manifest, not from the folder name", async () => {
    await temp.lake.writeJson("catalog/run=folder/manifest.json", manifest("inside", 1));

    const runs = await getRuns(temp.lake);

    expect(runs[0]?.id).toBe("inside");
  }); // the folder only locates the manifest
});
