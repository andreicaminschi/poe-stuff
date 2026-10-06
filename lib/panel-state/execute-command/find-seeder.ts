import type { Category, PanelState } from "../types.ts";

/** Finds a category by name, or throws. */
export function requireCategory(state: PanelState, name: string): Category {
  const category = state.categories[name];

  if (category === undefined) throw new Error(`No category "${name}".`);
  return category;
}

/** Finds the category holding a seeder name, or undefined. Seeder names are unique across categories. */
export const findSeederCategory = (state: PanelState, seeder: string): string | undefined =>
  Object.entries(state.categories).find(([, category]) => category.seeders?.[seeder] !== undefined)?.[0];

/** Finds the category holding a seeder name, or throws. */
export function requireSeederCategory(state: PanelState, seeder: string): string {
  const category = findSeederCategory(state, seeder);

  if (category === undefined) throw new Error(`No seeder "${seeder}".`);
  return category;
}

/** Throws when a new name is blank. */
export function requireName(name: string, what: string): void {
  if (name.trim() === "") throw new Error(`A ${what} needs a name.`);
}
