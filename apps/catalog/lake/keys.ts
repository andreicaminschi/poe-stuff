import type { Stage } from "../types.ts";

/** Everything under this prefix belongs to the catalog. */
const ROOT = "catalog";

/**
 * A field of a key, made safe to be one.
 *
 * `_` is removed rather than replaced, because it is the separator between fields: a league
 * that kept one would split into two fields and the key would stop being readable back. `-`
 * survives, which is what lets `ggg_currency-hour.json` mean source `ggg`, dataset
 * `currency-hour`.
 *
 * A `/` would silently become a folder on S3, so it goes the same way as every other
 * character that is not a letter, a digit or a hyphen.
 */
export const slug = (field: string): string =>
  field
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * What each source is called inside a run.
 *
 * Named here rather than in the step that writes it, because the validator has to read back
 * the same file and no step is allowed to import another.
 */
export const BRONZE_FILES = {
  gggItems: "ggg_items.json",
  currencyHour: "ggg_currency-hour.json",
  repoeBaseItems: "repoe_base-items.json",
  taxonomy: "taxonomy_items.json",
} as const;

/**
 * Everything one run produced, under one prefix.
 *
 * The run comes before the stage so that a run is a single folder: deleting one, copying
 * one, or looking at what an hour did is one path rather than two.
 */
export const runPrefix = (runId: string): string => `${ROOT}/run=${runId}`;

const stageKey = (runId: string, stage: Stage, file: string): string =>
  `${runPrefix(runId)}/${stage}/${file}`;

/** `catalog/run=allflame_1788256800/bronze/ggg_items.json`. */
export const bronzeKey = (runId: string, file: string): string =>
  stageKey(runId, "bronze", file);

/** `catalog/run=allflame_1788256800/silver/currency_essence.json`. */
export const silverKey = (runId: string, file: string): string =>
  stageKey(runId, "silver", file);

/**
 * One manifest for the whole run, beside the stages rather than inside one.
 *
 * `catalog/run=allflame_1788256800/manifest.json`.
 */
export const manifestKey = (runId: string): string =>
  `${runPrefix(runId)}/manifest.json`;
