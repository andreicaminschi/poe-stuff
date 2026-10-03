import { applyEntry } from "./apply-entry.ts";
import type { Category, PanelState, Seeder, WalEntry } from "./types.ts";

export type Stamp = {
  readonly id: string;
  readonly at: string;
  readonly actor: string;
};

/** Lists every seeder name, across every category. Low, Sonar 0. */
export const listSeederNames = (categories: readonly Category[]): readonly string[] =>
  categories.flatMap((category) => category.seeders.map((seeder) => seeder.name));

/** Finds a seeder by its category and name. Low, Sonar 0. */
export const findSeeder = (categories: readonly Category[], category: string, name: string): Seeder | undefined =>
  categories.find((at) => at.name === category)?.seeders.find((seeder) => seeder.name === name);

/** Finds a seeder by its category and name, or throws. Low, Sonar 1. */
export function requireSeeder(categories: readonly Category[], category: string, name: string): Seeder {
  const seeder = findSeeder(categories, category, name);

  if (seeder === undefined) throw new Error(`No seeder ${name} in ${category}.`);
  return seeder;
}

/** Finds a category by name, or throws. Low, Sonar 1. */
export function requireCategory(categories: readonly Category[], name: string): Category {
  const category = categories.find((at) => at.name === name);

  if (category === undefined) throw new Error(`No category ${name}.`);
  return category;
}

/** Builds a seeder entry: `before` leaves `category`, `after` enters it. Low, Sonar 2. */
export const buildEntry = (stamp: Stamp, category: string, before: Seeder | undefined, after: Seeder | undefined): WalEntry => ({
  ...stamp,
  category,
  ...(before === undefined
    ? {}
    : { before }),
  ...(after === undefined
    ? {}
    : { after }),
});

/** Returns the state with one entry applied and queued. Low, Sonar 0. */
export const withEntry = (state: PanelState, entry: WalEntry): PanelState => ({
  ...state,
  categories: applyEntry(state.categories, entry),
  pending: [...state.pending, entry],
});