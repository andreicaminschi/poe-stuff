import type { FilterBlock, FilterItem } from "@poe/filter-eval/filter-ast";
import { compileFilter } from "@poe/filter-eval/match-filter";
import { samplesOf } from "./samples-of.ts";
import { pathOf } from "./samples-of/path-of.ts";
import { sampleSets } from "./samples-of/sample-sets.ts";
import type { SampleCategories, SampleRow, UnfilteredReport, UnfilteredRow } from "./types.ts";

/**
 * Every sample no block of the filter takes, grouped by the row that built it. A `Hide` block
 * counts as taking a sample; only falling off the end of the filter does not.
 */
export function findUnfiltered(
  blocks: readonly FilterBlock[],
  rows: readonly SampleRow[],
  categories: SampleCategories,
): UnfilteredReport {
  const match = compileFilter(blocks);
  const byRow = new Map<string, { readonly row: SampleRow; readonly samples: FilterItem[] }>();
  let sampled = 0;
  let unfiltered = 0;

  for (const { row, item, reject } of samplesOf(rows, categories)) {
    if (reject !== undefined) continue;
    sampled++;
    if (match(item).winner !== undefined) continue;
    unfiltered++;
    const entry = byRow.get(row.key);
    if (entry === undefined) byRow.set(row.key, { row, samples: [item] });
    else entry.samples.push(item);
  }

  const unsampled = [
    ...new Set(
      rows.filter((row) => sampleSets(categories, row.category, row.subcategory) === undefined).map(pathOf),
    ),
  ].sort();

  const report: UnfilteredRow[] = [...byRow.values()].map(({ row, samples }) => ({
    key: row.key,
    name: row.name,
    category: row.category,
    subcategory: row.subcategory,
    samples,
  }));

  return { sampled, unfiltered, unsampled, rows: report };
}
