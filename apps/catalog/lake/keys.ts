import type { Stage } from "../types.ts";

const ROOT = "catalog";

export const slug = (field: string): string =>
  field
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const BRONZE_FILES = {
  gggItems: "ggg_items.json",
  currencyHour: "ggg_currency-hour.json",
  poeWatchCompact: "poe-watch_compact.json",
  poeWatchCorruptions: "poe-watch_corruptions.json",
  poeWatchRatios: "poe-watch_exchange-ratios.json",
  repoeBaseItems: "repoe_base-items.json",
  repoeGems: "repoe_gems.json",
  repoeEssences: "repoe_essences.json",
  repoeClusterJewels: "repoe_cluster-jewels.json",
  taxonomy: "taxonomy_items.json",
  taxonomyCategories: "taxonomy_categories.json",
} as const;

export const runPrefix = (runId: string): string => `${ROOT}/run=${runId}`;

const stageKey = (runId: string, stage: Stage, file: string): string =>
  `${runPrefix(runId)}/${stage}/${file}`;

export const bronzeKey = (runId: string, file: string): string =>
  stageKey(runId, "bronze", file);

export const silverKey = (runId: string, file: string): string =>
  stageKey(runId, "silver", file);

export const silverPrefix = (runId: string): string =>
  `${runPrefix(runId)}/silver`;

export const goldKey = (runId: string, file: string): string =>
  stageKey(runId, "gold", file);

export const goldPrefix = (runId: string): string => `${runPrefix(runId)}/gold`;

export const GOLD_FILES = {
  catalog: "catalog.json",
  categories: "catalog.categories.json",
} as const;

export const latestKey = (league: string, file: string): string =>
  `${ROOT}/latest/${slug(league)}.${file}`;

export const manifestKey = (runId: string): string =>
  `${runPrefix(runId)}/manifest.json`;
