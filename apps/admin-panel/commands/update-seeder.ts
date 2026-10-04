import { optional, required, SEEDER_PATCH, TEXT, type Params } from "../command-schema.ts";
import { buildEntry, requireSeeder, withEntry, type Stamp } from "../panel-state.ts";
import { patchSeeder } from "../patch-seeder.ts";
import type { PanelState, SeederPatch } from "../types.ts";

export type UpdateSeederCommand = {
  readonly type: "updateSeeder";
  readonly category: string;
  readonly seeder: string;
  readonly add?: SeederPatch;
  readonly remove?: SeederPatch;
};

export const updateSeederParams: Params<UpdateSeederCommand> = { category: required(TEXT), seeder: required(TEXT), add: optional(SEEDER_PATCH), remove: optional(SEEDER_PATCH) };

/** Adds and removes known items, tags and condition values on one seeder. Low, Sonar 0. */
export function executeUpdateSeeder(state: PanelState, command: UpdateSeederCommand, stamp: Stamp): PanelState {
  const before = requireSeeder(state.categories, command.category, command.seeder);

  return withEntry(state, buildEntry(stamp, command.category, before, patchSeeder(before, command.add, command.remove)));
}
