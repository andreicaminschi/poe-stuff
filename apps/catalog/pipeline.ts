import { buildGold } from "./build-gold.ts";
import { buildSilver } from "./build-silver.ts";
import { extractCurrencyHour } from "./extract-currency-hour.ts";
import { extractGGGItems } from "./extract-ggg-items.ts";
import { extractPoeWatchCompact } from "./extract-poe-watch-compact.ts";
import { extractPoeWatchCorruptions } from "./extract-poe-watch-corruptions.ts";
import { extractPoeWatchRatios } from "./extract-poe-watch-ratios.ts";
import { extractRepoeBaseItems } from "./extract-repoe-base-items.ts";
import { extractRepoeClusterJewels } from "./extract-repoe-cluster-jewels.ts";
import { extractRepoeEssences } from "./extract-repoe-essences.ts";
import { extractRepoeGems } from "./extract-repoe-gems.ts";
import { extractTaxonomy } from "./extract-taxonomy.ts";
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

/**
 * Every step there is, in the order they run.
 *
 * **This list is the pipeline.** A new source or a new silver file is a new file beside
 * this one and a line here — nothing else changes, because no step knows another exists.
 */
export const STEPS: readonly Step[] = [
  extractGGGItems,
  extractCurrencyHour,
  extractPoeWatchCompact,
  extractPoeWatchCorruptions,
  extractPoeWatchRatios,
  extractRepoeBaseItems,
  extractRepoeGems,
  extractRepoeEssences,
  extractRepoeClusterJewels,
  extractTaxonomy,
  validateBronze,
  buildSilver,
  buildGold,
];

/**
 * The stages, and whether a finished one can be left alone.
 *
 * Bronze is what a rerun skips: the hour it collected is gone and re-fetching it would give
 * a different answer, so a run that has it keeps it. Silver and gold are derived and are
 * always rebuilt — that is the whole of what "replay" means here, and why there is no flag
 * for it. `force` is the flag for the other direction, collecting bronze again.
 */
const STAGES: readonly { readonly stage: Stage; readonly reusable: boolean }[] = [
  { stage: "bronze", reusable: true },
  { stage: "silver", reusable: false },
  { stage: "gold", reusable: false },
];

export type RunOptions = {
  onEvent?: (event: PipelineEvent) => void;
  /**
   * Collect a stage the run already has.
   *
   * **This overwrites the record of what the sources said at that hour.** Bronze is skipped
   * on a replay precisely because re-fetching gives a different answer, so forcing it makes
   * the run's own history say something it did not say at the time. It is here because the
   * taxonomy is one of those sources and is ours: a table republished after a run was
   * collected reaches it no other way.
   */
  force?: boolean;
};

const noop = () => {};

/**
 * Runs one stage's steps in order and records what they wrote.
 *
 * **In order, never at once.** One GGG service is one IP and one budget; two steps calling
 * it in parallel would spend that budget twice as fast as the limiter believes.
 */
async function runStage(
  stage: Stage,
  context: StepContext,
  onEvent: (event: PipelineEvent) => void,
): Promise<StageRecord> {
  const startedAt = new Date().toISOString();
  const steps: ManifestStep[] = [];

  for (const step of STEPS.filter((candidate) => candidate.stage === stage)) {
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

/**
 * Every stage of one run, and the manifest they leave behind.
 *
 * The manifest is rewritten after each stage rather than once at the end, so a run that
 * dies during silver still records the bronze the next one can reuse. A stage with no steps
 * is skipped without an entry: claiming a stage finished when nothing ran is what would
 * make the next run skip work it never did.
 */
export async function runPipeline(
  context: StepContext,
  { onEvent = noop, force = false }: RunOptions = {},
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

    if (reusable && !force && manifest.stages[stage] !== undefined) {
      onEvent({ type: "stage-skipped", stage, reason: "already collected" });
      continue;
    }

    manifest = withStage(manifest, stage, await runStage(stage, context, onEvent));
    await writeManifest(lake, manifest);
  }

  return manifest;
}
