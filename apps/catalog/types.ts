import type { GGGService } from "@poe/ggg/service";
import type { Lake } from "@poe/lake/types";
import type { PoeWatchService } from "@poe/poe-watch/service";
import type { TaxonomyService } from "@poe/taxonomy/service";


export type StepContext = {
  readonly lake: Lake;
  readonly runId: string;
  readonly league: string;
  readonly hourId: number;
  readonly ggg: GGGService;
  readonly poeWatch: PoeWatchService;
  readonly taxonomy: TaxonomyService;
  readonly taxonomyVersion?: string;
};

export type StepResult = {
  readonly keys: readonly string[];
  readonly rows: number;
};

export type Step = {
  readonly id: string;
  readonly stage: Stage;
  readonly source?: string;
  run(context: StepContext): Promise<StepResult>;
};

export type Stage = "bronze" | "silver" | "gold";

export type PipelineEvent =
  | { type: "stage-skipped"; stage: Stage; reason: string }
  | { type: "step-started"; id: string; stage: Stage }
  | { type: "step-finished"; id: string; rows: number; keys: readonly string[] };

export type ManifestStep = {
  readonly id: string;
  readonly keys: readonly string[];
  readonly rows: number;
};

export type StageRecord = {
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly steps: readonly ManifestStep[];
};

export type Manifest = {
  readonly runId: string;
  readonly league: string;
  readonly hourId: number;
  readonly taxonomyVersion?: string;
  readonly stages: Readonly<Partial<Record<Stage, StageRecord>>>;
};
