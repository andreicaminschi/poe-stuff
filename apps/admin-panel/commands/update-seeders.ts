import { optional, required, SEEDER_PATCH, SEEDER_TARGETS, type Params } from "../command-schema.ts";
import { buildEntry, withEntry, type Stamp } from "../panel-state.ts";
import { patchSeeder } from "../patch-seeder.ts";
import { resolveSeederTargets, type SeederTargets } from "../seeder-targets.ts";
import type { PanelState, SeederPatch } from "../types.ts";

export type UpdateSeedersCommand = {
  readonly type: "updateSeeders";
  readonly targets: SeederTargets;
  readonly add?: SeederPatch;
  readonly remove?: SeederPatch;
};

export const updateSeedersParams: Params<UpdateSeedersCommand> = { targets: required(SEEDER_TARGETS), add: optional(SEEDER_PATCH), remove: optional(SEEDER_PATCH) };

/** Applies one patch to every targeted seeder. Low, Sonar 0. */
export const executeUpdateSeeders = (state: PanelState, command: UpdateSeedersCommand, stamp: Stamp): PanelState =>
  resolveSeederTargets(state.categories, command.targets).reduce(
    (next, { category, seeder }) => withEntry(next, buildEntry(stamp, category, seeder, patchSeeder(seeder, command.add, command.remove))),
    state,
  );
