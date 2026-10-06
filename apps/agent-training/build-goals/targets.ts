import type { PanelState, Targets } from "@poe/panel-state/types";
import { createFaker, deriveSeed } from "./derive-seed.ts";
import { listCategories, listSeedersIn, pickOne, pickSeeder, pickSome } from "./pick.ts";
import { formatNames, pickWording, varyName } from "./word.ts";

export type TargetShape = "seeder" | "seeders" | "category" | "categoryExcept" | "categories";

/** Targets for a bulk command, and how a person names them. */
export type DrawnTargets = { readonly targets: Targets; readonly phrase: string };

/** Draws one seeder. */
function drawSeeder(state: PanelState, seed: number): DrawnTargets {
  const { seeder } = pickSeeder(state, deriveSeed(seed, "seeder"));
  return { targets: { seeders: [seeder] }, phrase: varyName(seeder, deriveSeed(seed, "shown")) };
}

/** Picks two to four seeders of one category. */
const pickSeedersInOneCategory = (state: PanelState, seed: number): readonly string[] =>
  pickSome(listSeedersIn(state, pickOne(listCategories(state, 2), "a category with two seeders", deriveSeed(seed, "category"))), 2, 4, deriveSeed(seed, "seeders"));

/** Picks two to four seeders, each from a category of its own pick. */
function pickSeedersAnywhere(state: PanelState, seed: number): readonly string[] {
  const count = createFaker(deriveSeed(seed, "count")).number.int({ min: 2, max: 4 });
  return [...new Set(Array.from({ length: count }, (_, index) => pickSeeder(state, deriveSeed(seed, `seeder-${index}`)).seeder))];
}

/** Draws two to four seeders, mostly from one category. */
function drawSeeders(state: PanelState, seed: number): DrawnTargets {
  const seeders = createFaker(deriveSeed(seed, "spread")).datatype.boolean({ probability: 0.6 })
    ? pickSeedersInOneCategory(state, seed)
    : pickSeedersAnywhere(state, seed);

  return { targets: { seeders }, phrase: formatNames(seeders, deriveSeed(seed, "shown")) };
}

/** Draws every seeder of one category. */
function drawCategory(state: PanelState, seed: number): DrawnTargets {
  const category = pickOne(listCategories(state, 2), "a category with two seeders", deriveSeed(seed, "category"));
  const shown = varyName(category, deriveSeed(seed, "shown"));

  return {
    targets: { categories: [category] },
    phrase: pickWording([
      () => `every seeder in ${shown}`,
      () => `all of ${shown}`,
      () => `the ${shown} category`,
      () => `everything in ${shown}`,
      () => `the whole ${shown} category`,
      () => `all seeders in ${shown}`,
      () => `each seeder in ${shown}`,
      () => `all of the ${shown} seeders`,
    ], deriveSeed(seed, "wording")),
  };
}

/** Draws one category minus one or two of its seeders. */
function drawCategoryExcept(state: PanelState, seed: number): DrawnTargets {
  const category = pickOne(listCategories(state, 4), "a category with four seeders", deriveSeed(seed, "category"));
  const except = pickSome(listSeedersIn(state, category), 1, 2, deriveSeed(seed, "except"));
  const shown = varyName(category, deriveSeed(seed, "shown"));
  const left = formatNames(except, deriveSeed(seed, "left"));

  return {
    targets: { categories: [category], except },
    phrase: pickWording([
      () => `every seeder in ${shown} except ${left}`,
      () => `all of ${shown} but ${left}`,
      () => `${shown}, apart from ${left}`,
      () => `every seeder in ${shown} but not ${left}`,
      () => `${shown} except ${left}`,
      () => `all ${shown} seeders other than ${left}`,
      () => `everything in ${shown} besides ${left}`,
      () => `${shown} without ${left}`,
    ], deriveSeed(seed, "wording")),
  };
}

/** Draws every seeder of two categories. */
function drawCategories(state: PanelState, seed: number): DrawnTargets {
  const categories = pickSome(listCategories(state, 2), 2, 2, deriveSeed(seed, "categories"));
  const shown = formatNames(categories, deriveSeed(seed, "shown"));

  return {
    targets: { categories },
    phrase: pickWording([
      () => `every seeder in ${shown}`,
      () => `all of ${shown}`,
      () => `the ${shown} categories`,
      () => `both ${shown}`,
      () => `all seeders in ${shown}`,
      () => `everything in ${shown}`,
      () => `each seeder in ${shown}`,
      () => `the whole of ${shown}`,
    ], deriveSeed(seed, "wording")),
  };
}

const DRAWERS: Readonly<Record<TargetShape, (state: PanelState, seed: number) => DrawnTargets>> = {
  seeder: drawSeeder,
  seeders: drawSeeders,
  category: drawCategory,
  categoryExcept: drawCategoryExcept,
  categories: drawCategories,
};

/** Draws the targets of a bulk command in one shape, with the words a person would use for them. */
export const drawTargets = (state: PanelState, shape: TargetShape, seed: number): DrawnTargets => DRAWERS[shape](state, seed);
