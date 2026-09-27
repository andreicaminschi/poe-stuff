import { CONDITIONS, type ConditionName, type FilterItem } from "@poe/filter-eval/filter-ast";
import type { SampleProperty, SampleRow, SampleSet } from "../types.ts";
import { toItemValue } from "./to-item-value.ts";

export type Lookup = () => ReadonlyMap<string, readonly unknown[]>;

function rawValues(property: SampleProperty, name: string, row: SampleRow, lookup: Lookup): readonly unknown[] {
  if ("values" in property) return property.values;
  if (property.from === "name") return [row.name];
  if (property.from === "baseTypes") return row.baseTypes;
  return lookup().get(name) ?? [];
}

function literalValue(name: ConditionName, value: unknown): unknown {
  const converted = toItemValue(name, value);
  if (converted === undefined) throw new Error(`sample value ${JSON.stringify(value)} does not fit ${name}`);
  return converted;
}

function itemValues(property: SampleProperty, name: ConditionName, row: SampleRow, lookup: Lookup): readonly unknown[] {
  if ("values" in property) return property.values.map((value) => literalValue(name, value));
  return rawValues(property, name, row, lookup)
    .map((value) => toItemValue(name, value))
    .filter((value) => value !== undefined);
}

/**
 * The cartesian product of one set for one row. A property read off the row with no values
 * is left out. An unknown condition name, or a literal value that cannot fit it, throws.
 */
export function itemsOfSet(set: SampleSet, row: SampleRow, lookup: Lookup): readonly FilterItem[] {
  let items: Record<string, unknown>[] = [{}];

  for (const [name, property] of Object.entries(set)) {
    if (!(name in CONDITIONS)) throw new Error(`sample set names ${JSON.stringify(name)}, which is not a filter condition`);
    const values = itemValues(property, name as ConditionName, row, lookup);
    if (values.length === 0) continue;
    items = items.flatMap((item) => values.map((value) => ({ ...item, [name]: value })));
  }

  return items as readonly FilterItem[];
}
