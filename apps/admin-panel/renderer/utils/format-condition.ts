import type { Condition, ConditionValue } from "../../api/taxonomy.types.ts";

const showValue = (value: ConditionValue | undefined): string => {
  if (value === undefined) return "";
  if (value === null) return "(removed)";
  if (Array.isArray(value)) return value.map((entry) => `"${entry}"`).join(" ");
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "boolean") return value ? "True" : "False";
  return String(value);
};

export const formatCondition = (condition: Condition): string =>
  `${condition.condition} ${condition.operator ?? "=="} ${
    condition.from === undefined ? showValue(condition.value) : `‹${condition.from}›`
  }`;
