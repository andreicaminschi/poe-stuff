import { resolveForms } from "@poe/filter-compile/resolve-row";
import type { SampleCategories, SampleRow } from "../types.ts";

/**
 * Every value the row's resolved conditions hold, per condition name, across the row and
 * each of its variants.
 */
export function conditionValues(categories: SampleCategories, row: SampleRow): ReadonlyMap<string, readonly unknown[]> {
  const forms = resolveForms(
    categories,
    { name: row.name, baseTypes: row.baseTypes, category: row.category, subcategory: row.subcategory, conditions: row.conditions ?? [] },
    row.variants?.map((variant) => ({ name: variant.name, conditions: variant.conditions ?? [] })),
  );

  const values = new Map<string, Set<unknown>>();
  for (const form of forms) {
    for (const condition of form.conditions) {
      if (condition.value === undefined || condition.value === null) continue;
      const set = values.get(condition.condition) ?? new Set<unknown>();
      for (const one of Array.isArray(condition.value) ? condition.value : [condition.value]) set.add(one);
      values.set(condition.condition, set);
    }
  }

  return new Map([...values].map(([name, set]) => [name, [...set]]));
}
