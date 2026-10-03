import type { Stamp } from "../panel-state.ts";
import { resolveSeederTargets, type SeederTargets } from "../seeder-targets.ts";
import type { PanelState } from "../types.ts";
import { ensureCategory, moveOne } from "./move-seeder.ts";

export type MoveSeedersCommand = { readonly type: "moveSeeders"; readonly targets: SeederTargets; readonly toCategory: string };

/** Moves every targeted seeder to a category, created when missing. Low, Sonar 0. */
export function executeMoveSeeders(state: PanelState, command: MoveSeedersCommand, stamp: Stamp): PanelState {
  const targets = resolveSeederTargets(state.categories, command.targets);

  return targets.reduce(
    (next, { category, seeder }) => moveOne(next, category, seeder.name, command.toCategory, stamp),
    ensureCategory(state, command.toCategory, stamp),
  );
}
