import type { PanelState, Targets } from "../types.ts";
import { resolveTargets } from "./resolve-targets.ts";
import { writeSeeders } from "./write-seeder.ts";

export type DeleteSeedersCommand = { readonly type: "deleteSeeders"; readonly targets: Targets };

/** Removes every targeted seeder and its tags. */
export function executeDeleteSeeders(state: PanelState, command: DeleteSeedersCommand): PanelState {
  const targets = resolveTargets(state, command.targets);
  const deleted = targets.map((target) => target.seeder);
  const written = writeSeeders(state, targets.map(({ category, seeder }) => ({ category, seeder, value: undefined })));

  return { ...written, seederTags: Object.fromEntries(Object.entries(state.seederTags).filter(([seeder]) => !deleted.includes(seeder))) };
}
