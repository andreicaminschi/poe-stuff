import type { PanelState, Targets } from "../types.ts";
import { requireCategory } from "./find-seeder.ts";
import { resolveTargets } from "./resolve-targets.ts";
import { writeSeeders } from "./write-seeder.ts";

export type MoveSeedersCommand = { readonly type: "moveSeeders"; readonly targets: Targets; readonly toCategory: string };

/** Moves every targeted seeder into another category, contents unchanged. A seeder already there stays put. */
export function executeMoveSeeders(state: PanelState, command: MoveSeedersCommand): PanelState {
  requireCategory(state, command.toCategory);

  return writeSeeders(state, resolveTargets(state, command.targets)
    .filter((target) => target.category !== command.toCategory)
    .flatMap(({ category, seeder }) => [
      { category, seeder, value: undefined },
      { category: command.toCategory, seeder, value: state.categories[category]?.seeders?.[seeder] ?? {} },
    ]));
}
