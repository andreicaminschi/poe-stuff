import type { FilterItem } from "@poe/filter-eval/filter-ast";

const describeValue = (value: unknown): string => {
  if (!Array.isArray(value)) return String(value);
  return value.length === 0 ? "None" : value.join(" ");
};

/** One sample's properties as `Name value` pairs. */
export function describeSample(item: FilterItem): string {
  return Object.entries(item)
    .map(([name, value]) => `${name} ${describeValue(value)}`)
    .join(" · ");
}
