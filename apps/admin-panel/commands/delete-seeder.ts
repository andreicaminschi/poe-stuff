import { buildEntry, requireSeeder, withEntry, type Stamp } from "../panel-state.ts";
import type { PanelState } from "../types.ts";

export type DeleteSeederCommand = { readonly type: "deleteSeeder"; readonly category: string; readonly seeder: string };

/** Deletes a seeder. Low, Sonar 0. */
export const executeDeleteSeeder = (state: PanelState, command: DeleteSeederCommand, stamp: Stamp): PanelState =>
  withEntry(state, buildEntry(stamp, command.category, requireSeeder(state.categories, command.category, command.seeder), undefined));
