import type { Faker } from "@faker-js/faker";
import { expandSentinel } from "../../condition-values.ts";
import type { Category, ConditionValue, ItemData, PanelState, Seeder } from "../../types.ts";
import { sampleCondition } from "./conditions.ts";

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
  ...state.itemData.flatMap((item) => [item.name, ...(item.knownItems ?? [])]),
]);

/** Draws `count` names no one holds yet, and marks them taken. Low, Sonar 1. */
function drawNames(faker: Faker, taken: Set<string>, count: number, draw: (faker: Faker, taken: ReadonlySet<string>) => string): readonly string[] {
  return Array.from({ length: count }, () => {
    const name = draw(faker, taken);
    taken.add(name);
    return name;
  });
}

/** None a quarter of the time, else between 1 and `most`, so long lists show up too. Low, Sonar 1. */
const drawLength = (faker: Faker, most: number): number =>
  faker.datatype.boolean(0.25)
    ? 0
    : faker.number.int({ min: 1, max: most });

/** One or two real conditions, expanded from a sampled sentinel. Low, Sonar 1. */
function drawConditions(faker: Faker): Readonly<Record<string, readonly ConditionValue[]>> {
  return Object.fromEntries(Array.from({ length: faker.number.int({ min: 1, max: 2 }) }, () => {
    const condition = sampleCondition(faker);
    return [condition.key, expandSentinel(condition.key, condition.sentinel)];
  }));
}

/**
 * Builds one seeder: base types, tags from its category's pool so seeders share them, known
 * items, and sometimes real conditions. Low, Sonar 2.
 */
function buildSeeder(faker: Faker, taken: Set<string>, tagPool: readonly string[]): Seeder {
  const [name = ""] = drawNames(faker, taken, 1, drawSeederName);
  const baseTypes = drawNames(faker, taken, faker.number.int({ min: 1, max: 4 }), drawItemName);
  const knownItems = drawNames(faker, taken, drawLength(faker, 8), drawUniqueName);
  const conditions = faker.datatype.boolean(0.4)
    ? drawConditions(faker)
    : {};

  return {
    name,
    conditions: { ...conditions, BaseType: baseTypes },
    ...(knownItems.length === 0
      ? {}
      : { knownItems }),
    tags: faker.helpers.arrayElements(tagPool, drawLength(faker, tagPool.length)),
  };
}

/** Builds one category. Some are empty, so delete goals have targets; some are large. Low, Sonar 1. */
function buildCategory(faker: Faker, taken: Set<string>, empty: boolean): Category {
  const [name = ""] = drawNames(faker, taken, 1, drawCategoryName);
  const tagPool = [...new Set(Array.from({ length: faker.number.int({ min: 2, max: 6 }) }, () => drawTag(faker)))];

  return { name, seeders: Array.from({ length: countSeeders(faker, empty) }, () => buildSeeder(faker, taken, tagPool)) };
}

/** No seeders for an empty category, a long list a quarter of the time, else a few. Low, Sonar 2. */
function countSeeders(faker: Faker, empty: boolean): number {
  if (empty) return 0;
  if (faker.datatype.boolean(0.25)) return faker.number.int({ min: 8, max: 15 });
  return faker.number.int({ min: 2, max: 5 });
}

/** Item data for some base types: their own tags and known items. Low, Sonar 1. */
function buildItemData(faker: Faker, taken: Set<string>, categories: readonly Category[]): readonly ItemData[] {
  return categories.flatMap((category) => category.seeders.flatMap((seeder) => (seeder.conditions["BaseType"] ?? [])
    .filter((value): value is string => typeof value === "string")
    .filter(() => faker.datatype.boolean(0.4))
    .map((item) => {
      const knownItems = drawNames(faker, taken, drawLength(faker, 3), drawUniqueName);
      return {
        name: item,
        tags: Array.from({ length: drawLength(faker, 4) }, () => drawTag(faker)),
        ...(knownItems.length === 0
          ? {}
          : { knownItems }),
      };
    })));
}

/**
 * Builds a random panel: filled categories, a few empty ones, and item data. Lists run from
 * empty to long, so the context's filtered lists and counts get exercised. Low, Sonar 0.
 */
export function buildState(faker: Faker): PanelState {
  const taken = new Set<string>();
  const filled = Array.from({ length: faker.number.int({ min: 3, max: 5 }) }, () => buildCategory(faker, taken, false));
  const empty = Array.from({ length: faker.number.int({ min: 2, max: 4 }) }, () => buildCategory(faker, taken, true));

  return { version: "generated", state: "draft", categories: [...filled, ...empty], itemData: buildItemData(faker, taken, filled), log: [], pending: [] };
}
