import type { PanelState, SeederTags, Targets } from "../types.ts";
import { patchBag } from "./patch-bag.ts";
import { resolveTargets } from "./resolve-targets.ts";

export type UpdateSeederTagsCommand = {
  readonly type: "updateSeederTags";
  readonly targets: Targets;
  readonly add?: readonly string[];
  readonly remove?: readonly string[];
};

/**
 * Patches the tags of every targeted seeder: `remove` first, then `add`. A seeder's entry appears
 * with its first tag and goes with its last.
 *
 * @example
 * executeUpdateSeederTags(state, { type: "updateSeederTags", targets: { seeders: ["Rings"] }, add: ["chase"] });
 * // → state.seederTags.Rings = { tags: { chase: true } }
 */
export function executeUpdateSeederTags(state: PanelState, command: UpdateSeederTagsCommand): PanelState {
  const seeders = resolveTargets(state, command.targets).map((target) => target.seeder);
  const patched = seeders.map((seeder) => [seeder, patchBag(state.seederTags[seeder]?.tags, command.add, command.remove)] as const);
  const kept = Object.entries(state.seederTags).filter(([seeder]) => !seeders.includes(seeder));
  const written = patched.flatMap(([seeder, tags]): (readonly [string, SeederTags])[] => (tags === undefined
    ? []
    : [[seeder, { tags }]]));

  return { ...state, seederTags: Object.fromEntries([...kept, ...written]) };
}
