import { buildEntry, requireSeeder, withEntry, type Stamp } from "../panel-state.ts";
import type { PanelState } from "../types.ts";

export type MoveSeederCommand = {
  readonly type: "moveSeeder";
  readonly category: string;
  readonly seeder: string;
  readonly toCategory: string;
};

/** Creates `name` unless it exists. Low, Sonar 1. */
export const ensureCategory = (state: PanelState, name: string, stamp: Stamp): PanelState =>
  state.categories.some((category) => category.name === name)
    ? state
    : withEntry(state, { ...stamp, category: name, op: "createCategory" });

/** Moves one seeder into an existing category. Low, Sonar 0. */
export function moveOne(state: PanelState, category: string, seeder: string, toCategory: string, stamp: Stamp): PanelState {
  const before = requireSeeder(state.categories, category, seeder);

  return withEntry(state, { ...buildEntry(stamp, category, before, before), toCategory });
}

/** Moves a seeder to another category, created when missing. Its name is unique already, so it keeps it. Low, Sonar 0. */
export const executeMoveSeeder = (state: PanelState, command: MoveSeederCommand, stamp: Stamp): PanelState =>
  moveOne(ensureCategory(state, command.toCategory, stamp), command.category, command.seeder, command.toCategory, stamp);
