import type { Bag, TagSeeder, TagSeederPatch, TagSeederRemoval } from "../types.ts";
import { patchBag } from "./patch-bag.ts";

/** Patches every condition either side names. A condition left with no values is dropped. */
function patchConditions(conditions: TagSeeder["conditions"], add: TagSeederPatch["conditions"] = {}, remove: TagSeederRemoval["conditions"] = {}): TagSeeder["conditions"] {
  const names = [...new Set([...Object.keys(conditions), ...Object.keys(add)])];

  return Object.fromEntries(names.flatMap((name): (readonly [string, Bag])[] => {
    const removed = remove[name];
    const values = patchBag(removed === null
      ? undefined
      : conditions[name], add[name], removed ?? []);
    return values === undefined
      ? []
      : [[name, values]];
  }));
}

/**
 * Returns the tag seeder with `remove` taken out, then `add` put in. Throws when it would be left
 * with no condition or no tag, since a tag seeder is never stored empty.
 *
 * @example
 * patchTagSeeder({ conditions: { BaseType: { "Royal Plate": true } }, tags: { endgame: true } }, { conditions: { BaseType: ["Sacred Chainmail"] } });
 * // → { conditions: { BaseType: { "Royal Plate": true, "Sacred Chainmail": true } }, tags: { endgame: true } }
 */
export function patchTagSeeder(tagSeeder: TagSeeder, add: TagSeederPatch = {}, remove: TagSeederRemoval = {}): TagSeeder {
  const conditions = patchConditions(tagSeeder.conditions, add.conditions, remove.conditions);
  const tags = patchBag(tagSeeder.tags, add.tags, remove.tags);

  if (Object.keys(conditions).length === 0) throw new Error("A tag seeder needs a condition.");
  if (tags === undefined) throw new Error("A tag seeder needs a tag.");
  return { conditions, tags };
}
