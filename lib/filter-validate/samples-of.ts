import type { FilterItem } from "@poe/filter-eval/filter-ast";
import type { Sample, SampleCategories, SampleRow, SampleSet } from "./types.ts";
import { conditionValues } from "./samples-of/condition-values.ts";
import { itemsOfSet, type Lookup } from "./samples-of/items-of-set.ts";
import { pathOf } from "./samples-of/path-of.ts";
import { sampleSets } from "./samples-of/sample-sets.ts";

function groupByPath(rows: readonly SampleRow[]): ReadonlyMap<string, readonly SampleRow[]> {
  const groups = new Map<string, SampleRow[]>();
  for (const row of rows) {
    const group = groups.get(pathOf(row));
    if (group === undefined) groups.set(pathOf(row), [row]);
    else group.push(row);
  }
  return groups;
}

/** Each sample of the row with each reject set laid over it. */
function rejectsOf(
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

/**
 * Every sample item the taxonomy's sample sets build for the catalog rows, one at a time.
 *
 * A path's sets come from its subcategory record. A sample two rows on one path both build
 * is yielded once, for the first row. A subcategory's `rejects` sets are laid over each
 * sample and yielded with `reject` set: items the path must never take.
 */
export function* samplesOf(rows: readonly SampleRow[], categories: SampleCategories): Generator<Sample> {
  for (const group of groupByPath(rows).values()) {
    const [first] = group;
    if (first === undefined) continue;
    const sets = sampleSets(categories, first.category, first.subcategory);
    if (sets === undefined) continue;
    const rejects = first.subcategory === null ? [] : (categories[pathOf(first)]?.rejects ?? []);

    const seen = new Set<string>();
    for (const row of group) {
      let cached: ReadonlyMap<string, readonly unknown[]> | undefined;
      const lookup: Lookup = () => (cached ??= conditionValues(categories, row));

      for (const set of sets) {
        for (const item of itemsOfSet(set, row, lookup)) {
          const key = JSON.stringify(item);
          if (seen.has(key)) continue;
          seen.add(key);
          yield { row, item };

          for (const rejected of rejectsOf(item, rejects, row, lookup)) {
            const rejectKey = JSON.stringify(rejected.item);
            if (seen.has(rejectKey)) continue;
            seen.add(rejectKey);
            yield { row, item: rejected.item, reject: rejected.reject };
          }
        }
      }
    }
  }
}
