import type { Path, SummaryConfig } from "../types.ts";
import { compareText } from "./compare-text.ts";
import { isRecord } from "./is-record.ts";
import { matchesPattern } from "./matches-prefix.ts";

type ValueNames = NonNullable<SummaryConfig["valueNames"]>;

/**
 * Writes a set of values as the name the project gives that exact set, or as a sorted list
 * when it has none.
 *
 * @example
 * formatValues(["categories", "Bases", "seeders", "Rings", "conditions", "Rarity"], ["Rare", "Normal", "Magic"], { "categories.*.seeders.*.conditions.Rarity": { "non-unique": ["Normal", "Magic", "Rare"] } });
 * // → "non-unique"
 */
export function formatValues(path: Path, values: readonly string[], valueNames: ValueNames = {}): string {
  const sorted = [...values].sort(compareText);
  const named = Object.entries(valueNames)
    .filter(([pattern]) => matchesPattern(pattern, path))
    .flatMap(([, sets]) => Object.entries(sets))
    .find(([, set]) => set.length === sorted.length && set.every((value) => sorted.includes(value)));

  return named?.[0] ?? sorted.join(", ");
}

/** Writes any one state value as text: a map by its keys, anything else as it prints. */
export function formatValue(value: unknown, path: Path, valueNames: ValueNames = {}): string {
  if (isRecord(value)) return formatValues(path, Object.keys(value), valueNames);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
