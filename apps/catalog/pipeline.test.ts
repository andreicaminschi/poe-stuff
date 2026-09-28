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

describe("SOURCES", () => {
  it("names each outside source once, in step order", () => {
    expect(SOURCES).toEqual(["ggg", "poewatch", "taxonomy"]);
  });
});

describe("runPipeline", () => {
  it("runs every stage on a fresh run and records the taxonomy version", async () => {
    const { context } = servicesFor();

    const manifest = await runPipeline(context);

    expect([
      manifest.taxonomyVersion,
      Object.keys(manifest.stages),
      manifest.stages.bronze?.steps.map((step) => step.id),
    ]).toEqual([
      "3.29.4",
      ["bronze", "silver", "gold"],
      ["ggg-items", "poe-watch-compact", "poe-watch-corruptions", "poe-watch-ratios", "taxonomy", "validate-bronze"],
    ]);
    expect(await lake.exists("catalog/run=r_1/gold/catalog.json")).toBe(true);
  });

  it("reports each step's start and finish in order", async () => {
    const events: PipelineEvent[] = [];

    await runPipeline(servicesFor().context, { onEvent: (event) => events.push(event) });

    expect(
      events.filter((event) => event.type === "step-started").map((event) => event.type === "step-started" && event.id),
    ).toEqual([
      "ggg-items",
      "poe-watch-compact",
      "poe-watch-corruptions",
      "poe-watch-ratios",
      "taxonomy",
      "validate-bronze",
      "build-silver",
      "build-gold",
    ]);
  });

  it("reuses collected bronze on a second run and rebuilds silver and gold", async () => {
    await runPipeline(servicesFor().context);
    const second = servicesFor();
    const events: PipelineEvent[] = [];

    await runPipeline(second.context, { onEvent: (event) => events.push(event) });

    expect([second.calls, events[0]]).toEqual([
      [],
      { type: "stage-skipped", stage: "bronze", reason: "already collected" },
    ]);
  });

  it("refetches only the forced source, rerunning validation and keeping the other steps' records", async () => {
    const first = await runPipeline(servicesFor().context);
    const second = servicesFor();

    const manifest = await runPipeline(second.context, { force: new Set(["taxonomy"]) });

    expect(second.calls).toEqual(["taxonomy", "categories"]);
    expect(manifest.stages.bronze?.steps.map((step) => step.id)).toEqual(
      first.stages.bronze?.steps.map((step) => step.id),
    );
  });

  it("refuses an unknown source in force", async () => {
    const second = servicesFor();

    await expect(runPipeline(second.context, { force: new Set(["nope"]) })).rejects.toThrow(
      "Unknown source in force: nope. Known:",
    );
    expect(second.calls).toEqual([]);
  });

  it("writes no manifest when the collected bronze fails validation", async () => {
    const { context } = servicesFor();
    const broken = {
      ...context,
      taxonomy: { ...context.taxonomy, getCategories: jest.fn(async () => ({ version: "x" })) },
    } as unknown as StepContext;

    await expect(runPipeline(broken)).rejects.toThrow("not valid bronze");

    expect(await lake.exists("catalog/run=r_1/manifest.json")).toBe(false); // validation is a bronze step
  });
});
