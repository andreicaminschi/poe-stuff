import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLakeService } from "@poe/lake/service";
import type { Lake } from "@poe/lake/types";
import type { Manifest } from "../types.ts";
import { readManifest, withStage, writeManifest } from "./manifest.ts";

let root: string;
let lake: Lake;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "catalog-manifest-"));
  lake = createLakeService({ root });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const manifest: Manifest = { runId: "r_1", league: "L", hourId: 3600, stages: {} };
const record = { startedAt: "a", finishedAt: "b", steps: [] };

describe("readManifest", () => {
  it("answers nothing for a run that never wrote one", async () => {
    const read = await readManifest(lake, "r_1");

    expect(read).toBeUndefined();
  }); // a fresh run is not an error

  it("reads back what was written under the run", async () => {
    await writeManifest(lake, manifest);

    const read = await readManifest(lake, "r_1");

    expect(read).toEqual(manifest);
  }); // write keys by manifest.runId, read by the argument
});

describe("withStage", () => {
  it("records a stage without touching the manifest it was handed", () => {
    const next = withStage(manifest, "silver", record);

    expect([next.stages, manifest.stages]).toEqual([{ silver: record }, {}]);
  }); // a later stage cannot amend an earlier report

  it("replaces a stage that was already recorded", () => {
    const once = withStage(manifest, "gold", record);

    const twice = withStage(once, "gold", { ...record, finishedAt: "c" });

    expect(twice.stages.gold?.finishedAt).toBe("c");
  }); // a rebuild overwrites, never appends
});
