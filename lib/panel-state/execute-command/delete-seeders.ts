import type { PanelState, Targets } from "../types.ts";
import { resolveTargets } from "./resolve-targets.ts";
import { writeSeeders } from "./write-seeder.ts";

export type DeleteSeedersCommand = { readonly type: "deleteSeeders"; readonly targets: Targets };

/** Removes every targeted seeder. */
export const executeDeleteSeeders = (state: PanelState, command: DeleteSeedersCommand): PanelState =>
  writeSeeders(state, resolveTargets(state, command.targets).map(({ category, seeder }) => ({ category, seeder, value: undefined })));
