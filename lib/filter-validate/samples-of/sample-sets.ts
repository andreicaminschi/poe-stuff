import type { SampleCategories, SampleSet } from "../types.ts";

/** The subcategory's sets, else the category's, else none. */
export function sampleSets(
  categories: SampleCategories,
  category: string,
  subcategory: string | null,
): readonly SampleSet[] | undefined {
  const own = subcategory === null ? undefined : categories[`${category}/${subcategory}`]?.samples;
  return own ?? categories[category]?.samples;
}
