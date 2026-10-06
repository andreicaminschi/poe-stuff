import { resolveName } from "@poe/panel-state/resolve-name";
import type { PanelState, Seeder } from "@poe/panel-state/types";
import { createFaker, deriveSeed } from "./derive-seed.ts";

export type PlacedSeeder = { readonly category: string; readonly seeder: string; readonly value: Seeder };

/** Lists every seeder with the category that holds it. */
export const listSeeders = (state: PanelState): readonly PlacedSeeder[] =>
  Object.entries(state.categories).flatMap(([category, entry]) => Object.entries(entry.seeders ?? {}).map(([seeder, value]) => ({ category, seeder, value })));

/** Lists the categories holding at least `minimum` seeders. */
export const listCategories = (state: PanelState, minimum: number): readonly string[] =>
  Object.entries(state.categories).filter(([, entry]) => Object.keys(entry.seeders ?? {}).length >= minimum).map(([name]) => name);

/** Lists one category's seeder names. */
export const listSeedersIn = (state: PanelState, category: string): readonly string[] =>
  Object.keys(state.categories[category]?.seeders ?? {});

/** Picks one entry, or throws when there is none, so a goal never builds on nothing. */
export function pickOne<T>(values: readonly T[], what: string, seed: number): T {
  if (values.length === 0) throw new Error(`Nothing to pick: ${what}.`);
  return createFaker(seed).helpers.arrayElement(values as T[]);
}

/** Picks between `minimum` and `maximum` distinct entries. */
export const pickSome = <T>(values: readonly T[], minimum: number, maximum: number, seed: number): readonly T[] =>
  createFaker(seed).helpers.arrayElements(values as T[], { min: Math.min(minimum, values.length), max: Math.min(maximum, values.length) });

/**
 * Picks a seeder whose value passes a test: a category first, then a seeder in it, so the big
 * unique categories do not crowd out the small ones.
 */
export function pickSeeder(state: PanelState, seed: number, test: (seeder: PlacedSeeder) => boolean = () => true): PlacedSeeder {
  const passing = listSeeders(state).filter(test);
  const category = pickOne([...new Set(passing.map((placed) => placed.category))], "a category with a matching seeder", deriveSeed(seed, "category"));

  return pickOne(passing.filter((placed) => placed.category === category), "a seeder", deriveSeed(seed, "seeder"));
}

/** Draws a tag: any word, so the models learn a tag is whatever word the request names. */
export function drawTag(seed: number): string {
  const faker = createFaker(seed);

  return faker.helpers.arrayElement([
    () => faker.word.noun(),
    () => faker.word.adjective(),
    () => `${faker.word.adjective()}-${faker.word.noun()}`,
  ])();
}

/** Capitalizes the first letter. */
const capitalize = (text: string): string => `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

/**
 * Draws a name that is not, and does not look like, any category, seeder or item the state holds:
 * one the name matcher would resolve to an existing name is redrawn, so a new name never gets a
 * context line of its own.
 */
export function drawNewName(state: PanelState, seed: number): string {
  const faker = createFaker(seed);
  const known = [...Object.keys(state.categories), ...listSeeders(state).map((placed) => placed.seeder), ...Object.keys(state.items)];
  const name = faker.helpers.arrayElement([
    () => `${capitalize(faker.word.adjective())} ${capitalize(faker.word.noun())}`,
    () => capitalize(faker.word.noun()),
    () => `${capitalize(faker.word.noun())} ${faker.helpers.arrayElement(["Picks", "Drops", "Finds", "Loot", "Stuff"])}`,
  ])();

  return resolveName(name, known) === undefined
    ? name
    : drawNewName(state, deriveSeed(seed, "taken"));
}
