import type { PanelState, SeederPatch } from "../types.ts";
import { findSeederCategory, requireName, resolveCategory } from "./find-seeder.ts";
import { patchSeeder } from "./patch-seeder.ts";
import { writeSeeder } from "./write-seeder.ts";

export type CreateSeederCommand = {
  readonly type: "createSeeder";
  readonly category: string;
  readonly seeder: string;
  readonly add?: SeederPatch;
};

/** Adds a seeder to a category, filled with `add`. Throws when the name is blank or any category already holds it. The category may be misspelt; the new name is taken as written. */
export function executeCreateSeeder(state: PanelState, command: CreateSeederCommand): PanelState {
  requireName(command.seeder, "seeder");
  const category = resolveCategory(state, command.category);
  const holder = findSeederCategory(state, command.seeder);

  if (holder !== undefined) throw new Error(`Seeder "${command.seeder}" already exists in ${holder}.`);
  return writeSeeder(state, category, command.seeder, patchSeeder({}, command.add));
}
