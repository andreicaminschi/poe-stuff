import type { PanelState } from "../types.ts";
import { findSeederCategory, requireName, resolveCategory, resolveSeeder } from "./find-seeder.ts";

export type RenameCommand = {
  readonly type: "rename";
  readonly target: "category" | "seeder";
  readonly name: string;
  readonly to: string;
};

/** Returns the map with one key renamed and its value kept. */
const renameKey = <T>(record: Readonly<Record<string, T>>, name: string, to: string): Readonly<Record<string, T>> =>
  Object.fromEntries(Object.entries(record).map(([key, value]) => [key === name
    ? to
    : key, value]));

/** Renames a category, keeping its seeders. The current name may be misspelt; the new one is taken as written. */
function renameCategory(state: PanelState, name: string, to: string): PanelState {
  const category = resolveCategory(state, name);

  if (category === to) throw new Error(`"${category}" already has that name.`);
  if (state.categories[to] !== undefined) throw new Error(`Category "${to}" already exists.`);
  return { ...state, categories: renameKey(state.categories, category, to) };
}

/** Renames a seeder in place, keeping its contents and its category. The current name may be misspelt; the new one is taken as written. */
function renameSeeder(state: PanelState, name: string, to: string): PanelState {
  const { category, seeder } = resolveSeeder(state, name);
  const holder = findSeederCategory(state, to);

  if (seeder === to) throw new Error(`"${seeder}" already has that name.`);
  if (holder !== undefined) throw new Error(`Seeder "${to}" already exists in ${holder}.`);
  const seeders = state.categories[category]?.seeders ?? {};
  return { ...state, categories: { ...state.categories, [category]: { seeders: renameKey(seeders, seeder, to) } } };
}

/** Gives a category or a seeder a new name. Throws when the name matches nothing, the new one is taken, or nothing changes. */
export function executeRename(state: PanelState, command: RenameCommand): PanelState {
  requireName(command.to, command.target);
  if (command.target === "category") return renameCategory(state, command.name, command.to);
  return renameSeeder(state, command.name, command.to);
}
