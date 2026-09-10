import type { Draft } from "../../api/taxonomy.types.ts";

export function conditionNames(draft: Draft): readonly string[] {
  const conditions = [
    ...Object.values(draft.categories).flatMap((category) => category.conditions),
    ...Object.values(draft.items).flatMap((row) => [
      ...row.conditions,
      ...row.variants.flatMap((variant) => variant.conditions),
    ]),
  ];

  return [...new Set(conditions.map((condition) => condition.condition))].sort();
}
