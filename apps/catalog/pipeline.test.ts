import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLakeService } from "@poe/lake/service";
import type { Lake } from "@poe/lake/types";
import { BRONZE } from "./pipeline.fixtures.ts";
import { runPipeline, SOURCES } from "./pipeline.ts";
import type { PipelineEvent, StepContext } from "./types.ts";

let root: string;
let lake: Lake;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "catalog-pipeline-"));
  lake = createLakeService({ root });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

function servicesFor() {
  const calls: string[] = [];
  const answer =
    <T>(name: string, value: T) =>
      async () => {
        calls.push(name);
        return value;
      };

  return {
    calls,
    context: {
      lake,
      runId: "r_1",
      league: "L",
      hourId: 3600,
      ggg: { getItemData: answer("ggg", BRONZE["ggg_items.json"]) },
      poeWatch: {
        getCompactData: answer("compact", BRONZE["poe-watch_compact.json"]),
        getCorruptionData: answer("corruptions", BRONZE["poe-watch_corruptions.json"]),
        getExchangeRatios: answer("ratios", BRONZE["poe-watch_exchange-ratios.json"]),
      },
      taxonomy: {
        getTaxonomy: answer("taxonomy", BRONZE["taxonomy_items.json"]),
        getCategories: answer("categories", BRONZE["taxonomy_categories.json"]),
      },
    } as unknown as StepContext,
  };
}

const BRONZE_STEPS = ["ggg-items", "poe-watch-compact", "poe-watch-corruptions", "poe-watch-ratios", "taxonomy", "validate-bronze"];

describe("SOURCES", () => {
  it("names each outside source once, in step order", () => {
    expect(SOURCES).toEqual(["ggg", "poewatch", "taxonomy"]);
  }); // three PoeWatch steps share one source
});

describe("runPipeline", () => {
  it("runs bronze, silver and gold on a fresh run and publishes a gold catalog", async () => {
    const { context } = servicesFor();

    const manifest = await runPipeline(context);

    expect([Object.keys(manifest.stages), manifest.stages.bronze?.steps.map((step) => step.id)]).toEqual([
      ["bronze", "silver", "gold"],
      BRONZE_STEPS,
    ]);
    expect(await lake.exists("catalog/run=r_1/gold/catalog.json")).toBe(true);
  }); // validation is recorded as a bronze step

  it("records the taxonomy version the run collected, 3.29.4", async () => {
    const { context } = servicesFor();

    const manifest = await runPipeline(context);

    expect(manifest.taxonomyVersion).toBe("3.29.4");
  }); // read back from bronze, not from the version asked for

  it("reports each step's start in pipeline order", async () => {
    const events: PipelineEvent[] = [];

    await runPipeline(servicesFor().context, { onEvent: (event) => events.push(event) });

    expect(events.flatMap((event) => (event.type === "step-started"
      ? [event.id]
      : []))).toEqual([
      ...BRONZE_STEPS,
      "build-silver",
      "build-gold",
    ]);
  }); // steps run one after another, never in parallel

  it("calls no outside source on a second run and says bronze was already collected", async () => {
    await runPipeline(servicesFor().context);
    const second = servicesFor();
    const events: PipelineEvent[] = [];

    await runPipeline(second.context, { onEvent: (event) => events.push(event) });

    expect([second.calls, events[0]]).toEqual([[], { type: "stage-skipped", stage: "bronze", reason: "already collected" }]);
  }); // only bronze is reusable; silver and gold rebuild

  it("refetches only the taxonomy when forced to, and keeps every other bronze step's record", async () => {
    const first = await runPipeline(servicesFor().context);
    const second = servicesFor();

    const manifest = await runPipeline(second.context, { force: new Set(["taxonomy"]) });

    expect(second.calls).toEqual(["taxonomy", "categories"]);
    expect(manifest.stages.bronze?.steps.map((step) => step.id)).toEqual(first.stages.bronze?.steps.map((step) => step.id));
  }); // fresh lines merge over old ones in step order, validation reruns

  it("refuses an unknown source in force before calling anything", async () => {
    const second = servicesFor();

    await expect(runPipeline(second.context, { force: new Set(["nope"]) })).rejects.toThrow("Unknown source in force: nope. Known:");

    expect(second.calls).toEqual([]);
  }); // a typo must not trigger a partial refetch

  it("writes no manifest when the collected bronze fails validation", async () => {
    const { context } = servicesFor();
    const broken = {
      ...context,
      taxonomy: { ...context.taxonomy, getCategories: jest.fn(async () => ({ version: "x" })) },
    } as unknown as StepContext;

    await expect(runPipeline(broken)).rejects.toThrow("not valid bronze");

    expect(await lake.exists("catalog/run=r_1/manifest.json")).toBe(false);
  }); // the manifest is written after the stage, so the next run collects again
});
