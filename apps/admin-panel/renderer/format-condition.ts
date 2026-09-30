import type { ConditionValue } from "../types.ts";

/** Formats one value for the seeder line: a range as `a` or `a-b`. Low, Sonar 1. */
function formatValue(value: ConditionValue): string {
  if (typeof value !== "object") return String(value);

  return value[0] === value[1]
    ? String(value[0])
    : `${value[0]}-${value[1]}`;
}

/** Formats one condition as `Key: a | b`. Low, Sonar 0. */
export const formatCondition = (key: string, values: readonly ConditionValue[]): string =>
  `${key}: ${values.map(formatValue).join(" | ")}`;
