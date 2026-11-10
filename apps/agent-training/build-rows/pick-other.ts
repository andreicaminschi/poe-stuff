import type { PanelState } from "@poe/panel-state/types";
import { deriveSeed } from "../build-scenarios/derive-seed.ts";
import { listSeeders, listSeedersIn, pickOne, pickSeeder, pickSome } from "../build-scenarios/pick.ts";

/** Picks a category other than the ones named. */
export const pickOtherCategory = (state: PanelState, named: readonly string[], seed: number): string =>
  pickOne(Object.keys(state.categories).filter((name) => !named.includes(name)), "another category", seed);

/** Picks `count` categories, none of them named. */
export const pickOtherCategories = (state: PanelState, named: readonly string[], count: number, seed: number): readonly string[] =>
  pickSome(Object.keys(state.categories).filter((name) => !named.includes(name)), count, count, seed);

/** Picks `count` seeders, none of them named, each category first. */
export const pickOtherSeeders = (state: PanelState, named: readonly string[], count: number, seed: number): readonly string[] =>
  [...new Set(Array.from({ length: count }, (_, index) => pickSeeder(state, deriveSeed(seed, `seeder-${index}`), (placed) => !named.includes(placed.seeder)).seeder))];

/** Picks `count` known item names the seeders hold, none of them named. */
export const pickOtherNames = (state: PanelState, named: readonly string[], count: number, seed: number): readonly string[] =>
  pickSome([...new Set(listSeeders(state).flatMap((placed) => Object.keys(placed.value.names ?? {})))].filter((name) => !named.includes(name)), count, count, seed);

/** Picks `count` base types the seeders hold, none of them named. */
export const pickOtherBaseTypes = (state: PanelState, named: readonly string[], count: number, seed: number): readonly string[] =>
  pickSome([...new Set(listSeeders(state).flatMap((placed) => Object.keys(placed.value.conditions?.BaseType ?? {})))].filter((name) => !named.includes(name)), count, count, seed);

/** Picks a tag seeder other than the named one, or undefined when there is none. */
export function pickOtherTagSeeder(state: PanelState, named: string, seed: number): string | undefined {
  const others = Object.keys(state.tagSeeders).filter((name) => name !== named);
  return others.length === 0
    ? undefined
    : pickOne(others, "another tag seeder", seed);
}

/** Picks a seeder sitting in the same category as the named one, other than it. */
export function pickSiblingSeeder(state: PanelState, seeder: string, seed: number): string | undefined {
  const category = Object.entries(state.categories).find(([, entry]) => entry.seeders?.[seeder] !== undefined)?.[0];
  const siblings = category === undefined
    ? []
    : listSeedersIn(state, category).filter((name) => name !== seeder);

  return siblings.length === 0
    ? undefined
    : pickOne(siblings, "a sibling seeder", seed);
}
