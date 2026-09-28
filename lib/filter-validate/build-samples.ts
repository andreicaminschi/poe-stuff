import type { FilterItem } from "@poe/filter-eval/filter-ast";
import type { Sample, SampleCategories, SampleRow, SampleSet } from "./types.ts";
import { conditionValues } from "./build-samples/condition-values.ts";
import { itemsOfSet, type Lookup } from "./build-samples/items-of-set.ts";
import { formatPath } from "./build-samples/format-path.ts";
import { sampleSets } from "./build-samples/sample-sets.ts";

/**
 * Builds the items a path must never take: the sample item, with each reject set's values
 * written over it. `reject` names the values that were written.
 */
function buildRejects(
  item: FilterItem,
  rejects: readonly SampleSet[],
  row: SampleRow,
  lookup: Lookup,
): readonly { readonly item: FilterItem; readonly reject: string }[] {
  return rejects.flatMap((set) =>
    itemsOfSet(set, row, lookup).map((override) => ({
      item: { ...item, ...override },
      reject: JSON.stringify(override),
    })),
  );
}

/** Builds one row's sample items, each followed by its reject items. */
function* buildRowSamples(
  row: SampleRow,
  sets: readonly SampleSet[],
  rejects: readonly SampleSet[],
  categories: SampleCategories,
): Generator<Sample> {
  let cached: ReadonlyMap<string, readonly unknown[]> | undefined;
  const lookup: Lookup = () => (cached ??= conditionValues(categories, row));

  for (const item of sets.flatMap((set) => itemsOfSet(set, row, lookup))) {
    yield { row, item };
    for (const rejected of buildRejects(item, rejects, row, lookup)) yield { row, ...rejected };
  }
}

/**
 * Builds every sample and reject item for the rows of one path, duplicates included.
 * Yields nothing when the path has no sample sets.
 */
function* buildPathSamples(rows: readonly SampleRow[], categories: SampleCategories): Generator<Sample> {
  const [first] = rows;
  if (first === undefined) return;
  const sets = sampleSets(categories, first.category, first.subcategory);
  if (sets === undefined) return;
  const rejects = first.subcategory === null
    ? []
    : (categories[formatPath(first)]?.rejects ?? []);

  for (const row of rows) yield* buildRowSamples(row, sets, rejects, categories);
}

/**
 * Builds the fake items the filter validator checks the filter against, one at a time.
 *
 * Each catalog row gets the items its path's sample sets describe, plus reject items the path
 * must never take. An item that two rows on one path both build is yielded once, for the first row.
 */
export function* buildSamples(rows: readonly SampleRow[], categories: SampleCategories): Generator<Sample> {
  for (const group of Map.groupBy(rows, formatPath).values()) {
    const seen = new Set<string>();
    for (const sample of buildPathSamples(group, categories)) {
      const key = JSON.stringify(sample.item);
      if (seen.has(key)) continue;
      seen.add(key);
      yield sample;
    }
  }
}
