import { sampleSets } from "../samples-of/sample-sets.ts";
import type { SampleCategories, SampleRow } from "../types.ts";

/** The properties a row's sample sets give more than one value. */
export function variedProperties(categories: SampleCategories, row: SampleRow): readonly string[] {
  const varied = new Set<string>();
  for (const set of sampleSets(categories, row.category, row.subcategory) ?? []) {
    for (const [name, property] of Object.entries(set)) {
      if ("values" in property && property.values.length > 1) varied.add(name);
    }
  }
  return [...varied].sort();
}
