import { compileFilter as writeFilter, type CompileRow } from "@poe/filter-compile/compile-filter";
import type { CategoryRecords } from "@poe/filter-compile/resolve-row";
import type { FilterItem } from "@poe/filter-eval/filter-ast";
import { compileFilter } from "@poe/filter-eval/match-filter";
import { parseFilter } from "@poe/filter-eval/parse-filter";
import { buildSamples } from "@poe/filter-validate/build-samples";
import type { SampleCategories } from "@poe/filter-validate/types";
import { findBlockLinks } from "./build-eval-cases/find-block-links.ts";
import { findUniqueLinks } from "./build-eval-cases/find-unique-links.ts";
import type { LinkRow, PoeWatchLink } from "./build-eval-cases/types.ts";

/** What the generator reads off a catalog row. */
export type EvalRow = CompileRow & LinkRow;

export type EvalCase = {
  readonly item: FilterItem;
  readonly matches: readonly PoeWatchLink[];
};

/**
 * Generates test items with their expected price entries, for testing the item classifier.
 * A unique item is answered by its base's unique listings, and any other item by the
 * compiled filter.
 */
export function buildEvalCases(
  rows: readonly EvalRow[],
  categories: SampleCategories & CategoryRecords,
): readonly EvalCase[] {
  const filterMatcher = compileFilter(parseFilter(writeFilter(rows, categories).text));
  const rowsByKey = new Map(rows.map((row) => [row.key, row]));
  const basesByName = new Map(rows.filter((row) => row.uniques !== undefined).map((row) => [row.name, row]));

  const seen = new Set<string>();
  const cases: EvalCase[] = [];
  for (const { item, reject } of buildSamples(rows, categories)) {
    const key = JSON.stringify(item);
    if (reject !== undefined || seen.has(key)) continue;
    seen.add(key);
    const matches =
      item.Rarity === "Unique"
        ? findUniqueLinks(item, basesByName)
        : findBlockLinks(item, filterMatcher, rowsByKey);
    cases.push({ item, matches });
  }
  return cases;
}
