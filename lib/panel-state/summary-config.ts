import type { SummaryConfig } from "@util/diff-summary/types";
import { VALUE_SETS } from "./value-sets.ts";

/** The words `summarizeDiff` uses for this state. The runtime and the training generator share it. */
export const SUMMARY_CONFIG: SummaryConfig = {
  levels: {
    "categories.*": { one: "category", many: "categories" },
    "categories.*.seeders.*": { one: "seeder", many: "seeders", unique: true },
    "categories.*.seeders.*.tags.*": { one: "tag", many: "tags" },
    "categories.*.seeders.*.knownItems.*": { one: "known item", many: "known items" },
    "categories.*.seeders.*.conditions.*": { one: "condition", many: "conditions" },
    "items.*": { one: "item", many: "items" },
    "items.*.tags.*": { one: "tag", many: "tags" },
    "items.*.knownItems.*": { one: "known item", many: "known items" },
  },
  valueNames: Object.fromEntries(Object.entries(VALUE_SETS).map(([condition, sets]) => [`categories.*.seeders.*.conditions.${condition}`, sets])),
};
