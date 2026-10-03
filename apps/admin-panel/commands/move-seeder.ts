import { buildEntry, requireCategory, requireSeeder, withEntry, type Stamp } from "../panel-state.ts";
import type { PanelState } from "../types.ts";

export type MoveSeederCommand = {
  readonly type: "moveSeeder";
  readonly category: string;
  readonly seeder: string;
  readonly toCategory: string;
};

/** Moves a seeder to another category. Its name is unique already, so it keeps it. Low, Sonar 0. */
export function executeMoveSeeder(state: PanelState, command: MoveSeederCommand, stamp: Stamp): PanelState {
  const before = requireSeeder(state.categories, command.category, command.seeder);
  const target = requireCategory(state.categories, command.toCategory);

  return withEntry(state, { ...buildEntry(stamp, command.category, before, before), toCategory: target.name });
}
