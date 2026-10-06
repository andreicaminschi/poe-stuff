import type { PanelState, Targets } from "../types.ts";
import { resolveCategory } from "./find-seeder.ts";
import { resolveTargets } from "./resolve-targets.ts";
import { writeSeeders } from "./write-seeder.ts";

export type MoveSeedersCommand = { readonly type: "moveSeeders"; readonly targets: Targets; readonly toCategory: string };

/** Moves every targeted seeder into another category, contents unchanged. A seeder already there stays put. The destination may be misspelt. */
export function executeMoveSeeders(state: PanelState, command: MoveSeedersCommand): PanelState {
  const destination = resolveCategory(state, command.toCategory);

  return writeSeeders(state, resolveTargets(state, command.targets)
    .filter((target) => target.category !== destination)
    .flatMap(({ category, seeder }) => [
      { category, seeder, value: undefined },
      { category: destination, seeder, value: state.categories[category]?.seeders?.[seeder] ?? {} },
    ]));
}
