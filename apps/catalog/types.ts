import type { GGGService } from "@poe/ggg/service";
import type { RepoeService } from "@poe/repoe/service";

/**
 * Somewhere a run's files live. Two implementations are planned and only one is written:
 * the local disk under `.s3`, and a bucket once there is one to write to.
 *
 * Keys are built in `lake/keys.ts` and handed in whole. Nothing here knows what a run or a
 * category is, which is what lets the same object serve both stages.
 */
export type Lake = {
  readJson<T>(key: string): Promise<T>;
  writeJson(key: string, value: unknown): Promise<void>;
  exists(key: string): Promise<boolean>;
};

/**
 * Everything a step is handed. The services are built by whoever runs the pipeline — the
 * CLI reads its own environment for the user agent — so a step never constructs one and
 * never reads `process.env`.
 */
export type StepContext = {
  readonly lake: Lake;
  /** `allflame_1788253200`. The `run=` prefix belongs to the key, not to the id. */
  readonly runId: string;
  readonly league: string;
  /** Unix seconds on the hour. */
  readonly hourId: number;
  readonly ggg: GGGService;
  readonly repoe: RepoeService;
};

/**
 * What a step wrote. Returned rather than recorded into something the step was handed, so
 * the manifest is built from return values and a step cannot quietly amend another's.
 */
export type StepResult = {
  readonly keys: readonly string[];
  /** How many things the step wrote, in whatever unit the step counts. */
  readonly rows: number;
};

/**
 * One unit of the pipeline. A step names the keys it reads and the keys it writes and is
 * coupled to the others through the lake alone — none of them import each other, so a new
 * step is a new file plus a line in `STEPS`.
 */
export type Step = {
  readonly id: string;
  readonly stage: Stage;
  run(context: StepContext): Promise<StepResult>;
};

export type Stage = "bronze" | "silver";

/**
 * What the pipeline is doing, as it happens. Runs inline and is never awaited, so it must
 * not throw. Absent by default — a step's own return value is what the manifest is built
 * from, and this is only for whoever is watching.
 */
export type PipelineEvent =
  | { type: "stage-skipped"; stage: Stage; reason: string }
  | { type: "step-started"; id: string; stage: Stage }
  | { type: "step-finished"; id: string; rows: number; keys: readonly string[] };

/** One step's line in the manifest. */
export type ManifestStep = {
  readonly id: string;
  readonly keys: readonly string[];
  readonly rows: number;
};

/** One stage's record, written once every step in it has succeeded. */
export type StageRecord = {
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly steps: readonly ManifestStep[];
};

/**
 * One manifest for the whole run, holding a record per stage that finished.
 *
 * A stage appears here only after its last step succeeded, so the presence of the key is
 * the answer to "is this stage complete?" — a run that died halfway has files and no entry,
 * and gets collected again rather than half-read.
 */
export type Manifest = {
  readonly runId: string;
  readonly league: string;
  readonly hourId: number;
  readonly stages: Readonly<Partial<Record<Stage, StageRecord>>>;
};
