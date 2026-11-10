import type { PanelState, TagSeederPatch, TagSeederRemoval } from "../types.ts";
import { resolveTagSeeder } from "./find-tag-seeder.ts";
import { patchTagSeeder } from "./patch-tag-seeder.ts";

export type UpdateTagSeederCommand = {
  readonly type: "updateTagSeeder";
  readonly name: string;
  readonly add?: TagSeederPatch;
  readonly remove?: TagSeederRemoval;
};

/** Patches one tag seeder: `remove` first, then `add`. The name may be misspelt. Throws when it would be left empty. */
export function executeUpdateTagSeeder(state: PanelState, command: UpdateTagSeederCommand): PanelState {
  const name = resolveTagSeeder(state, command.name);
  const current = state.tagSeeders[name] ?? { conditions: {}, tags: {} };
  return { ...state, tagSeeders: { ...state.tagSeeders, [name]: patchTagSeeder(current, command.add, command.remove) } };
}
