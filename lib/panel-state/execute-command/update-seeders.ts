import type { PanelState, SeederPatch, SeederRemoval, Targets } from "../types.ts";
import { patchSeeder } from "./patch-seeder.ts";
import { resolveTargets } from "./resolve-targets.ts";
import { writeSeeders } from "./write-seeder.ts";

export type UpdateSeedersCommand = {
  readonly type: "updateSeeders";
  readonly targets: Targets;
  readonly add?: SeederPatch;
  readonly remove?: SeederRemoval;
};

/** Applies one patch to every targeted seeder: `remove` first, then `add`. */
export const executeUpdateSeeders = (state: PanelState, command: UpdateSeedersCommand): PanelState =>
  writeSeeders(state, resolveTargets(state, command.targets).map(({ category, seeder }) => ({
    category,
    seeder,
    value: patchSeeder(state.categories[category]?.seeders?.[seeder] ?? {}, command.add, command.remove),
  })));
