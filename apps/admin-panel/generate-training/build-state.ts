import type { Faker } from "@faker-js/faker";
import type { Category, PanelState, Seeder } from "../types.ts";

const capitalize = (word: string): string => `${word.charAt(0).toUpperCase()}${word.slice(1)}`;

/** Draws names until one is not taken. Low, Sonar 1. */
function drawFree(draw: () => string, taken: ReadonlySet<string>): string {
  let name = draw();
  while (taken.has(name)) name = draw();
  return name;
}

export const drawCategoryName = (faker: Faker, taken: ReadonlySet<string>): string =>
  drawFree(() => `${capitalize(faker.word.adjective())} ${faker.commerce.department()}`, taken);

export const drawSeederName = (faker: Faker, taken: ReadonlySet<string>): string =>
  drawFree(() => `${capitalize(faker.word.adjective())} ${capitalize(faker.word.noun())}`, taken);

export const drawItemName = (faker: Faker, taken: ReadonlySet<string>): string =>
  drawFree(() => faker.commerce.productName(), taken);

export const drawUniqueName = (faker: Faker, taken: ReadonlySet<string>): string =>
  drawFree(() => `${faker.person.lastName()}'s ${capitalize(faker.word.noun())}`, taken);

export const drawTag = (faker: Faker): string => faker.word.adjective().toLowerCase();

/** Every name the state holds: categories, seeders, items and known items. Low, Sonar 0. */
export const listTakenNames = (state: PanelState): ReadonlySet<string> => new Set([
  ...state.categories.map((category) => category.name),
  ...state.categories.flatMap((category) => category.seeders.flatMap((seeder) => [
    seeder.name,
    ...(seeder.conditions["BaseType"] ?? []).filter((value): value is string => typeof value === "string"),
    ...(seeder.knownItems ?? []),
  ])),
]);

/** Builds one seeder with base types, maybe tags and known items. Low, Sonar 1. */
function buildSeeder(faker: Faker, taken: Set<string>): Seeder {
  const name = drawSeederName(faker, taken);
  taken.add(name);
  const baseTypes = Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => {
    const item = drawItemName(faker, taken);
    taken.add(item);
    return item;
  });
  const knownItems = faker.datatype.boolean(0.3)
    ? [drawUniqueName(faker, taken)]
    : [];
  knownItems.forEach((item) => taken.add(item));

  return {
    name,
    conditions: { BaseType: baseTypes },
    ...(knownItems.length === 0
      ? {}
      : { knownItems }),
    tags: faker.datatype.boolean(0.3)
      ? [drawTag(faker)]
      : [],
  };
}

/** Builds one category. Some are empty, so delete goals have targets. Low, Sonar 1. */
function buildCategory(faker: Faker, taken: Set<string>, empty: boolean): Category {
  const name = drawCategoryName(faker, taken);
  taken.add(name);
  const count = empty
    ? 0
    : faker.number.int({ min: 2, max: 5 });

  return { name, seeders: Array.from({ length: count }, () => buildSeeder(faker, taken)) };
}

/** Builds a small random panel: filled categories, then a few empty ones. Low, Sonar 0. */
export function buildState(faker: Faker): PanelState {
  const taken = new Set<string>();
  const filled = Array.from({ length: faker.number.int({ min: 3, max: 5 }) }, () => buildCategory(faker, taken, false));
  const empty = Array.from({ length: faker.number.int({ min: 2, max: 4 }) }, () => buildCategory(faker, taken, true));

  return { version: "generated", state: "draft", categories: [...filled, ...empty], itemData: [], log: [], pending: [] };
}
