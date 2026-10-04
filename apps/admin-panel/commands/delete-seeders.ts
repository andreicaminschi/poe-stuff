import { required, SEEDER_TARGETS, type Params } from "../command-schema.ts";
import { buildEntry, withEntry, type Stamp } from "../panel-state.ts";
import { resolveSeederTargets, type SeederTargets } from "../seeder-targets.ts";
import type { PanelState } from "../types.ts";

export type DeleteSeedersCommand = { readonly type: "deleteSeeders"; readonly targets: SeederTargets };

export const deleteSeedersParams: Params<DeleteSeedersCommand> = { targets: required(SEEDER_TARGETS) };

/** Deletes every targeted seeder. Low, Sonar 0. */
export const executeDeleteSeeders = (state: PanelState, command: DeleteSeedersCommand, stamp: Stamp): PanelState =>
  resolveSeederTargets(state.categories, command.targets).reduce(
    (next, { category, seeder }) => withEntry(next, buildEntry(stamp, category, seeder, undefined)),
    state,
  );
