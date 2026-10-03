import type { ConditionValue, Seeder, SeederPatch } from "./types.ts";

type Conditions = Seeder["conditions"];

/** Keeps the values `remove` does not name, then appends the `add` values not yet there. Low, Sonar 1. */
export function patchValues<T>(values: readonly T[], add: readonly T[] = [], remove: readonly T[] = []): readonly T[] {
  const removed = new Set(remove.map((value) => JSON.stringify(value)));
  const kept = values.filter((value) => !removed.has(JSON.stringify(value)));
  const present = new Set(kept.map((value) => JSON.stringify(value)));

  return [...kept, ...add.filter((value) => !present.has(JSON.stringify(value)))];
}

/** Patches every condition either side names. A condition left with no values is dropped. Low, Sonar 1. */
function patchConditions(conditions: Conditions, add: Conditions = {}, remove: Conditions = {}): Conditions {
  const keys = [...new Set([...Object.keys(conditions), ...Object.keys(add)])];
  const patched = keys.map((key): [string, readonly ConditionValue[]] => [key, patchValues(conditions[key] ?? [], add[key], remove[key])]);

  return Object.fromEntries(patched.filter(([, values]) => values.length > 0));
}

/**
 * Returns the seeder with `remove` taken out of its known items, tags and condition values,
 * then `add` appended where missing. An empty known-item list is dropped. Low, Sonar 1.
 *
 * @example
 * patchSeeder({ name: "Belts", conditions: { BaseType: ["Cloth Belt"] }, tags: [] }, { tags: ["chase"] }, {});
 * // → { name: "Belts", conditions: { BaseType: ["Cloth Belt"] }, tags: ["chase"] }
 */
export function patchSeeder(seeder: Seeder, add: SeederPatch = {}, remove: SeederPatch = {}): Seeder {
  const { knownItems: _knownItems, ...rest } = seeder;
  const knownItems = patchValues(seeder.knownItems ?? [], add.knownItems, remove.knownItems);

  return {
    ...rest,
    conditions: patchConditions(seeder.conditions, add.conditions, remove.conditions),
    ...(knownItems.length === 0
      ? {}
      : { knownItems }),
    tags: patchValues(seeder.tags, add.tags, remove.tags),
  };
}
