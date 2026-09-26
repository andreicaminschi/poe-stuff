import { compileFilter as writeFilter, type CompileRow } from "@poe/filter-compile/compile-filter";
import type { CategoryRecords } from "@poe/filter-compile/resolve-row";
import type { FilterItem } from "@poe/filter-eval/filter-ast";
import { compileFilter } from "@poe/filter-eval/match-filter";
import { parseFilter } from "@poe/filter-eval/parse-filter";
import { samplesOf } from "@poe/filter-validate/samples-of";
import type { SampleCategories } from "@poe/filter-validate/types";
import { collapseRarity } from "./eval-cases/collapse-rarity.ts";
import { matchesOf, type LinkRow, type PoeWatchLink } from "./eval-cases/matches-of.ts";

export const ROWS_PER_PATH = 3;

/** What the generator reads off a catalog row. */
export type EvalRow = CompileRow & LinkRow;

export type EvalCase = {
  readonly item: FilterItem;
  readonly matches: readonly PoeWatchLink[];
};

const pathOf = (row: EvalRow): string =>
  row.subcategory === null ? row.category : `${row.category}/${row.subcategory}`;

/** The first few rows of each path, by key. */
function pickRows(rows: readonly EvalRow[]): readonly EvalRow[] {
  const sorted = [...rows].sort((a, b) => a.key.localeCompare(b.key));
  return [...Map.groupBy(sorted, pathOf).values()].flatMap((group) => group.slice(0, ROWS_PER_PATH));
}

/**
 * One case per distinct sample item, off a few catalog rows per path.
 *
 * The answer is what the compiled taxonomy says the item is: the first block that takes it,
 * read back to its row or variant, and that row's PoeWatch entry.
 */
export function evalCases(
  rows: readonly EvalRow[],
  categories: SampleCategories & CategoryRecords,
): readonly EvalCase[] {
  const match = compileFilter(parseFilter(writeFilter(rows, categories).text));
  const rowsByKey = new Map(rows.map((row) => [row.key, row]));
  const basesByName = new Map(rows.filter((row) => row.uniques !== undefined).map((row) => [row.name, row]));

  const seen = new Set<string>();
  const cases: EvalCase[] = [];
  for (const { item, reject } of samplesOf(pickRows(rows), collapseRarity(categories))) {
    if (reject !== undefined) continue;
    const key = JSON.stringify(item);
    if (seen.has(key)) continue;
    seen.add(key);
    cases.push({ item, matches: matchesOf(item, match, rowsByKey, basesByName) });
  }
  return cases;
}
