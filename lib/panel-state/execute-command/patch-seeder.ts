import type { ConditionValues, Seeder, SeederPatch, SeederRemoval, SplitSettings } from "../types.ts";
import { patchBag } from "./patch-bag.ts";

/** Returns one condition's values with `remove` taken out, then `add` put in, or undefined when none are left. */
function patchValues(values: ConditionValues | undefined, add: ConditionValues | undefined, remove: readonly string[] | null | undefined): ConditionValues | undefined {
  const kept = remove === null
    ? []
    : Object.entries(values ?? {}).filter(([value]) => !(remove ?? []).includes(value));
  const patched = { ...Object.fromEntries(kept), ...add };

  if (Object.keys(patched).length === 0) return undefined;
  return patched;
}

/** Patches every condition either side names. A condition left with no values is dropped. */
function patchConditions(conditions: Readonly<Record<string, ConditionValues>>, add: SeederPatch["conditions"] = {}, remove: SeederRemoval["conditions"] = {}): Readonly<Record<string, ConditionValues>> {
  const names = [...new Set([...Object.keys(conditions), ...Object.keys(add)])];

  return Object.fromEntries(names.flatMap((name) => {
    const values = patchValues(conditions[name], add[name], remove[name]);
    return values === undefined
      ? []
      : [[name, values] as const];
  }));
}

/** Returns the split overrides with `remove` dropped, then `add` set, or undefined when none are left. */
function patchSplit(split: SplitSettings | undefined, add: SplitSettings = {}, remove: readonly string[] = []): SplitSettings | undefined {
  const kept = Object.entries(split ?? {}).filter(([name]) => !remove.includes(name));
  const patched = { ...Object.fromEntries(kept), ...add };

  if (Object.keys(patched).length === 0) return undefined;
  return patched;
}

/**
 * Returns the seeder with `remove` taken out, then `add` put in. Anything left empty is dropped,
 * so the seeder stays in the keyed shape.
 *
 * @example
 * patchSeeder({ conditions: { ItemLevel: { "68-100": "range" } } }, { conditions: { ItemLevel: { "84": ">=" } } }, { conditions: { ItemLevel: ["68-100"] } });
 * // → { conditions: { ItemLevel: { "84": ">=" } } }
 */
export function patchSeeder(seeder: Seeder, add: SeederPatch = {}, remove: SeederRemoval = {}): Seeder {
  const conditions = patchConditions(seeder.conditions ?? {}, add.conditions, remove.conditions);
  const split = patchSplit(seeder.split, add.split, remove.split);
  const tags = patchBag(seeder.tags, add.tags, remove.tags);
  const names = patchBag(seeder.names, add.names, remove.names);

  return {
    ...(Object.keys(conditions).length === 0
      ? {}
      : { conditions }),
    ...(split === undefined
      ? {}
      : { split }),
    ...(tags === undefined
      ? {}
      : { tags }),
    ...(names === undefined
      ? {}
      : { names }),
  };
}
