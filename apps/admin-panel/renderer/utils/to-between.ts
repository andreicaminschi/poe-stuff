import type { Condition } from "../../api/taxonomy/types.ts";

/** The condition at `index` as a `>=` and `<=` pair, both on its number. */
export function toBetween(conditions: readonly Condition[], index: number): readonly Condition[] {
  const condition = conditions[index];
  if (condition === undefined) return conditions;

  const value = typeof condition.value === "number" ? condition.value : 0;

  return [
    ...conditions.slice(0, index),
    { condition: condition.condition, operator: ">=", value },
    { condition: condition.condition, operator: "<=", value },
    ...conditions.slice(index + 1),
  ];
}
