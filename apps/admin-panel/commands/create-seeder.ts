import { findFreeName } from "../find-free-name.ts";
import { buildEntry, listSeederNames, requireCategory, withEntry, type Stamp } from "../panel-state.ts";
import type { PanelState } from "../types.ts";

export type CreateSeederCommand = { readonly type: "createSeeder"; readonly category: string; readonly name: string };

/** Creates an empty seeder under a name no seeder in any category holds. Low, Sonar 0. */
export function executeCreateSeeder(state: PanelState, command: CreateSeederCommand, stamp: Stamp): PanelState {
  const category = requireCategory(state.categories, command.category);
  const name = findFreeName(command.name, listSeederNames(state.categories));

  return withEntry(state, buildEntry(stamp, category.name, undefined, { name, conditions: {}, tags: [] }));
}
