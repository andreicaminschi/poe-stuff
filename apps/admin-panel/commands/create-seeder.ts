import { findFreeName } from "../find-free-name.ts";
import { buildEntry, listSeederNames, requireCategory, withEntry, type Stamp } from "../panel-state.ts";
import type { PanelState } from "../types.ts";

export type CreateSeederCommand = { readonly type: "createSeeder"; readonly category: string; readonly names: readonly string[] };

/** Creates one empty seeder under a name no seeder in any category holds. Low, Sonar 0. */
function createOne(state: PanelState, category: string, name: string, stamp: Stamp): PanelState {
  const target = requireCategory(state.categories, category);
  const free = findFreeName(name, listSeederNames(state.categories));

  return withEntry(state, buildEntry(stamp, target.name, undefined, { name: free, conditions: {}, tags: [] }));
}

/** Creates an empty seeder per name. Low, Sonar 0. */
export const executeCreateSeeder = (state: PanelState, command: CreateSeederCommand, stamp: Stamp): PanelState =>
  command.names.reduce((next, name) => createOne(next, command.category, name, stamp), state);
