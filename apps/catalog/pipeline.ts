import { buildGold } from "./build-gold.ts";
import { buildSilver } from "./build-silver.ts";
import { extractGGGItems } from "./extract-ggg-items.ts";
import { extractPoeWatchCompact } from "./extract-poe-watch-compact.ts";
import { extractPoeWatchCorruptions } from "./extract-poe-watch-corruptions.ts";
import { extractPoeWatchRatios } from "./extract-poe-watch-ratios.ts";
import { extractTaxonomy } from "./extract-taxonomy.ts";
import { BRONZE_FILES, bronzeKey } from "./lake/keys.ts";
import { readManifest, withStage, writeManifest } from "./pipeline/manifest.ts";
import { validateBronze } from "./validate-bronze.ts";
import type {
  Manifest,
  ManifestStep,
  PipelineEvent,
  Stage,
  StageRecord,
  Step,
  StepContext,
} from "./types.ts";

export const STEPS: readonly Step[] = [
  extractGGGItems,
  extractPoeWatchCompact,
  extractPoeWatchCorruptions,
  extractPoeWatchRatios,
  extractTaxonomy,
  validateBronze,
  buildSilver,
  buildGold,
];

export const SOURCES: readonly string[] = [
  ...new Set(STEPS.flatMap((step) => (step.source === undefined ? [] : [step.source]))),
];

const STAGES: readonly { readonly stage: Stage; readonly reusable: boolean }[] = [
  { stage: "bronze", reusable: true },
  { stage: "silver", reusable: false },
  { stage: "gold", reusable: false },
];

export type Force = ReadonlySet<string>;

export type RunOptions = {
  onEvent?: (event: PipelineEvent) => void;
  force?: Force;
};

const noop = () => {};

const NONE: Force = new Set();

async function runStage(
  stage: Stage,
  context: StepContext,
  onEvent: (event: PipelineEvent) => void,
  include: (step: Step) => boolean,
): Promise<StageRecord> {
  const startedAt = new Date().toISOString();
  const steps: ManifestStep[] = [];

  for (const step of STEPS.filter((candidate) => candidate.stage === stage && include(candidate))) {
    onEvent({ type: "step-started", id: step.id, stage });

    const result = await step.run(context);

    onEvent({
      type: "step-finished",
      id: step.id,
      rows: result.rows,
      keys: result.keys,
    });
    steps.push({ id: step.id, keys: result.keys, rows: result.rows });
  }

  return { startedAt, finishedAt: new Date().toISOString(), steps };
}

const mergeRecords = (old: StageRecord, fresh: StageRecord): StageRecord => ({
  ...fresh,
  steps: STEPS.flatMap(
    (step) =>
      fresh.steps.find((line) => line.id === step.id) ??
      old.steps.find((line) => line.id === step.id) ??
      [],
  ),
});

function bronzePlan(
  existing: StageRecord | undefined,
  force: Force,
): ((step: Step) => boolean) | undefined {
  if (existing === undefined) return () => true;
  if (force.size === 0) return undefined;

  return (step) => step.source === undefined || force.has(step.source);
}

async function taxonomyVersionOf(context: StepContext): Promise<string | undefined> {
  const key = bronzeKey(context.runId, BRONZE_FILES.taxonomy);

  return (await context.lake.exists(key))
    ? (await context.lake.readJson<{ version: string }>(key)).version
    : undefined;
}

export async function runPipeline(
  context: StepContext,
  { onEvent = noop, force = NONE }: RunOptions = {},
): Promise<Manifest> {
  const { lake, runId, league, hourId } = context;

  let manifest = (await readManifest(lake, runId)) ?? {
    runId,
    league,
    hourId,
    stages: {},
  };

  for (const { stage, reusable } of STAGES) {
    if (!STEPS.some((step) => step.stage === stage)) continue;

    const existing = manifest.stages[stage];
    const include = reusable ? bronzePlan(existing, force) : () => true;

    if (include === undefined) {
      onEvent({ type: "stage-skipped", stage, reason: "already collected" });
    } else {
      const fresh = await runStage(stage, context, onEvent, include);
      manifest = withStage(
        manifest,
        stage,
        reusable && existing !== undefined ? mergeRecords(existing, fresh) : fresh,
      );
    }

    if (stage === "bronze") {
      const taxonomyVersion = await taxonomyVersionOf(context);
      manifest = taxonomyVersion === undefined ? manifest : { ...manifest, taxonomyVersion };
    }

    await writeManifest(lake, manifest);
  }

  return manifest;
}
