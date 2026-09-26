import { CONDITIONS, type ConditionName } from "@poe/filter-eval/filter-ast";

const countedValue = (value: unknown): unknown => {
  if (typeof value === "string") return [value];
  return Array.isArray(value) && value.every((one) => typeof one === "string") ? value : undefined;
};

/**
 * A sample value in the shape `FilterItem` holds for that condition. Undefined when the
 * value cannot be one.
 */
export function toItemValue(name: ConditionName, value: unknown): unknown {
  const kind = CONDITIONS[name].kind;

  if (kind === "enums") {
    if (typeof value !== "string") return undefined;
    return value.toLowerCase() === "none" ? [] : [value];
  }
  if (kind === "counted") return countedValue(value);
  if (kind === "gem" && typeof value === "boolean") return value ? undefined : "";
  if (kind === "boolean") return typeof value === "boolean" ? value : undefined;
  if (kind === "numeric") return typeof value === "number" ? value : undefined;
  return typeof value === "string" ? value : undefined;
}
