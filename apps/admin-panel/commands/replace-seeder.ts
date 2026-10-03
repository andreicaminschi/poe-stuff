import { buildEntry, listSeederNames, requireCategory, requireSeeder, withEntry, type Stamp } from "../panel-state.ts";
import type { PanelState, Seeder } from "../types.ts";

export type ReplaceSeederCommand = {
  readonly type: "replaceSeeder";
  readonly category: string;
  readonly seeder: string;
  readonly with: Seeder;
};

/** Replaces a whole seeder inside its category, rename included. A name any other seeder holds is refused. Low, Sonar 1. */
export function executeReplaceSeeder(state: PanelState, command: ReplaceSeederCommand, stamp: Stamp): PanelState {
  const before = requireSeeder(state.categories, command.category, command.seeder);
  const category = requireCategory(state.categories, command.category);
  const renamed = command.with.name !== before.name;

  if (renamed && listSeederNames(state.categories).includes(command.with.name)) throw new Error(`A seeder called ${command.with.name} already exists.`);

  return withEntry(state, buildEntry(stamp, category.name, before, command.with));
}
