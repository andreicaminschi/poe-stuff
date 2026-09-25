import { CONDITIONS, type ConditionName, type FilterItem } from "@poe/filter-eval/filter-ast";
import type { Sample, SampleCategories, SampleProperty, SampleRow, SampleSet } from "./types.ts";
import { conditionValues } from "./samples-of/condition-values.ts";
import { pathOf } from "./samples-of/path-of.ts";
import { sampleSets } from "./samples-of/sample-sets.ts";
import { toItemValue } from "./samples-of/to-item-value.ts";

type Lookup = () => ReadonlyMap<string, readonly unknown[]>;

function rawValues(property: SampleProperty, name: string, row: SampleRow, lookup: Lookup): readonly unknown[] {
  if ("values" in property) return property.values;
  if (property.from === "name") return [row.name];
  if (property.from === "baseTypes") return row.baseTypes;
  return lookup().get(name) ?? [];
}

function itemValues(property: SampleProperty, name: ConditionName, row: SampleRow, lookup: Lookup): readonly unknown[] {
  return rawValues(property, name, row, lookup)
    .map((value) => toItemValue(name, value))
    .filter((value) => value !== undefined);
}

/** The cartesian product of one set for one row. A property with no values is left out. */
function itemsOfSet(set: SampleSet, row: SampleRow, lookup: Lookup): readonly FilterItem[] {
  let items: Record<string, unknown>[] = [{}];

  for (const [name, property] of Object.entries(set)) {
    if (!(name in CONDITIONS)) continue;
    const values = itemValues(property, name as ConditionName, row, lookup);
    if (values.length === 0) continue;
    items = items.flatMap((item) => values.map((value) => ({ ...item, [name]: value })));
  }

  return items as readonly FilterItem[];
}

function groupByPath(rows: readonly SampleRow[]): ReadonlyMap<string, readonly SampleRow[]> {
  const groups = new Map<string, SampleRow[]>();
  for (const row of rows) {
    const group = groups.get(pathOf(row));
    if (group === undefined) groups.set(pathOf(row), [row]);
    else group.push(row);
  }
  return groups;
}

/**
 * Every sample item the taxonomy's sample sets build for the catalog rows, one at a time.
 *
 * A path's sets come from its subcategory record, else its category record. A sample two
 * rows on one path both build is yielded once, for the first row.
 */
export function* samplesOf(rows: readonly SampleRow[], categories: SampleCategories): Generator<Sample> {
  for (const group of groupByPath(rows).values()) {
    const [first] = group;
    if (first === undefined) continue;
    const sets = sampleSets(categories, first.category, first.subcategory);
    if (sets === undefined) continue;

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
        }
      }
    }
  }
}
