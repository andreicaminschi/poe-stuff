import type { SampleCategories, SampleSet } from "../types.ts";

/** The subcategory's sets, or none. A category holds no samples. */
export function sampleSets(
  categories: SampleCategories,
  category: string,
  subcategory: string | null,
): readonly SampleSet[] | undefined {
  return subcategory === null ? undefined : categories[`${category}/${subcategory}`]?.samples;
}
