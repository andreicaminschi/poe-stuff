import type { Bag, ConditionValues, Seeder, SeederPatch, SeederRemoval } from "../types.ts";
import { VALUE_SETS } from "../value-sets.ts";
import { patchBag } from "./patch-bag.ts";

/** Turns a value set's name or a literal list into the values a condition stores. Throws on an unknown set name. */
function resolveValues(condition: string, values: ConditionValues): readonly string[] {
  if (typeof values !== "string") return values.map(String);

  const named = VALUE_SETS[condition]?.[values];
  if (named === undefined) throw new Error(`${condition} has no value set "${values}".`);
  return named;
}

/** Returns the values a removal takes out of one condition, every value when it drops the whole condition. */
function listRemovedValues(condition: string, current: Bag | undefined, removal: ConditionValues | null | undefined): readonly string[] {
  if (removal === undefined) return [];
  if (removal === null) return Object.keys(current ?? {});
  return resolveValues(condition, removal);
}

/** Patches every condition either side names. A condition left with no values is dropped. */
function patchConditions(conditions: Readonly<Record<string, Bag>>, add: SeederPatch["conditions"] = {}, remove: SeederRemoval["conditions"] = {}): Readonly<Record<string, Bag>> {
  const names = [...new Set([...Object.keys(conditions), ...Object.keys(add)])];

  return Object.fromEntries(names.flatMap((name) => {
    const added = add[name];
    const bag = patchBag(conditions[name], added === undefined
      ? []
      : resolveValues(name, added), listRemovedValues(name, conditions[name], remove[name]));
    return bag === undefined
      ? []
      : [[name, bag] as const];
  }));
}

/**
 * Returns the seeder with `remove` taken out of its conditions, tags and known items, then `add`
 * put in. Anything left empty is dropped, so the seeder stays in the keyed shape.
 *
 * @example
 * patchSeeder({ conditions: { Rarity: { Normal: true, Magic: true, Rare: true } } }, { conditions: { Rarity: "magic-or-better" } }, { conditions: { Rarity: null } });
 * // → { conditions: { Rarity: { Magic: true, Rare: true, Unique: true } } }
 */
export function patchSeeder(seeder: Seeder, add: SeederPatch = {}, remove: SeederRemoval = {}): Seeder {
  const conditions = patchConditions(seeder.conditions ?? {}, add.conditions, remove.conditions);
  const tags = patchBag(seeder.tags, add.tags, remove.tags);
  const knownItems = patchBag(seeder.knownItems, add.knownItems, remove.knownItems);

  return {
    ...(Object.keys(conditions).length === 0
      ? {}
      : { conditions }),
    ...(tags === undefined
      ? {}
      : { tags }),
    ...(knownItems === undefined
      ? {}
      : { knownItems }),
  };
}
