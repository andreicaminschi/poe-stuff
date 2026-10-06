import { resolveName } from "../resolve-name.ts";
import type { PanelState } from "../types.ts";

/** Lists every seeder name with the category holding it. */
const listPlacedSeeders = (state: PanelState): readonly { readonly category: string; readonly seeder: string }[] =>
  Object.entries(state.categories).flatMap(([category, entry]) => Object.keys(entry.seeders ?? {}).map((seeder) => ({ category, seeder })));

/** Finds the stored category name a typed one means, or throws. A misspelt name resolves when one category is close enough. */
export function resolveCategory(state: PanelState, name: string): string {
  const category = resolveName(name, Object.keys(state.categories));

  if (category === undefined) throw new Error(`No category "${name}".`);
  return category;
}

/** Finds the category holding a seeder name, or undefined. Exact only, for checking whether a name is taken. */
export const findSeederCategory = (state: PanelState, seeder: string): string | undefined =>
  listPlacedSeeders(state).find((placed) => placed.seeder === seeder)?.category;

/** Finds the stored seeder a typed name means, with its category, or throws. A misspelt name resolves when one seeder is close enough. */
export function resolveSeeder(state: PanelState, name: string): { readonly category: string; readonly seeder: string } {
  const placed = listPlacedSeeders(state);
  const seeder = resolveName(name, placed.map((entry) => entry.seeder));
  const found = placed.find((entry) => entry.seeder === seeder);

  if (found === undefined) throw new Error(`No seeder "${name}".`);
  return found;
}

/** Finds the stored item name a typed one means, or throws. */
export function resolveItem(state: PanelState, name: string): string {
  const item = resolveName(name, Object.keys(state.items));

  if (item === undefined) throw new Error(`No item "${name}".`);
  return item;
}

/** Throws when a new name is blank. */
export function requireName(name: string, what: string): void {
  if (name.trim() === "") throw new Error(`A ${what} needs a name.`);
}
