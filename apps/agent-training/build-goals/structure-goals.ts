import type { PanelState } from "@poe/panel-state/types";
import type { GoalBuilder, GoalDraft } from "../types.ts";
import { drawConditionChange } from "./conditions.ts";
import { createFaker, deriveSeed } from "./derive-seed.ts";
import { drawNewName, drawTag, listCategories, listSeedersIn, pickOne, pickSeeder, pickSome } from "./pick.ts";
import { formatNames, pickWording, varyName, withArticle } from "./word.ts";

/** Builds a goal that creates an empty category. */
const buildCreateCategoryGoal: GoalBuilder = (state, seed) => {
  const name = drawNewName(state, deriveSeed(seed, "name"));

  return {
    request: pickWording([() => `Create a category called ${name}`, () => `Add a new category ${name}`, () => `I need ${withArticle(name)} category`, () => `New category: ${name}`], deriveSeed(seed, "wording")),
    setup: [],
    steps: [{ type: "createCategory", category: name }],
  };
};

/** Builds a goal that creates an empty seeder in a category. */
const buildCreateSeederGoal: GoalBuilder = (state, seed) => {
  const category = pickOne(Object.keys(state.categories), "a category", deriveSeed(seed, "category"));
  const name = drawNewName(state, deriveSeed(seed, "name"));
  const shown = varyName(category, deriveSeed(seed, "shown"));

  return {
    request: pickWording([() => `Create a seeder ${name} in ${shown}`, () => `Add ${withArticle(name)} seeder to ${shown}`, () => `${shown} needs a new seeder called ${name}`], deriveSeed(seed, "wording")),
    setup: [],
    steps: [{ type: "createSeeder", category, seeder: name }],
  };
};

/** Builds a create-seeder goal whose new seeder already carries a tag. */
function buildCreateSeederWithTag(category: string, name: string, shown: string, seed: number): GoalDraft {
  const tag = drawTag(deriveSeed(seed, "tag"));

  return {
    request: pickWording([() => `Create ${withArticle(name)} seeder in ${shown}, tagged ${tag}`, () => `Add seeder ${name} to ${shown} with the tag ${tag}`], deriveSeed(seed, "wording")),
    setup: [],
    steps: [{ type: "createSeeder", category, seeder: name, add: { tags: [tag] } }],
  };
}

/** Builds a create-seeder goal whose new seeder already carries a condition. */
function buildCreateSeederWithCondition(category: string, name: string, shown: string, seed: number): GoalDraft {
  const change = drawConditionChange(deriveSeed(seed, "change"));

  return {
    request: pickWording([() => `Create ${withArticle(name)} seeder in ${shown} with ${change.phrase}`, () => `Add seeder ${name} to ${shown}, requiring ${change.phrase}`], deriveSeed(seed, "wording")),
    setup: [],
    steps: [{ type: "createSeeder", category, seeder: name, add: { conditions: { [change.condition]: change.value } } }],
  };
}

/** Builds a goal that creates a seeder with a tag or a condition already on it. */
const buildCreateSeederWithGoal: GoalBuilder = (state: PanelState, seed: number) => {
  const category = pickOne(Object.keys(state.categories), "a category", deriveSeed(seed, "category"));
  const name = drawNewName(state, deriveSeed(seed, "name"));
  const shown = varyName(category, deriveSeed(seed, "shown"));

  return createFaker(deriveSeed(seed, "with")).datatype.boolean()
    ? buildCreateSeederWithTag(category, name, shown, seed)
    : buildCreateSeederWithCondition(category, name, shown, seed);
};

/** Builds a goal that renames one seeder. */
const buildRenameSeederGoal: GoalBuilder = (state, seed) => {
  const { seeder } = pickSeeder(state, deriveSeed(seed, "seeder"));
  const name = drawNewName(state, deriveSeed(seed, "name"));
  const shown = varyName(seeder, deriveSeed(seed, "shown"));

  return {
    request: pickWording([() => `Rename ${shown} to ${name}`, () => `Call the ${shown} seeder ${name}`, () => `${shown} should be named ${name}`, () => `Change the name of ${shown} to ${name}`], deriveSeed(seed, "wording")),
    setup: [],
    steps: [{ type: "rename", target: "seeder", name: seeder, to: name }],
  };
};

/** Builds a goal that renames one category. */
const buildRenameCategoryGoal: GoalBuilder = (state, seed) => {
  const category = pickOne(Object.keys(state.categories), "a category", deriveSeed(seed, "category"));
  const name = drawNewName(state, deriveSeed(seed, "name"));
  const shown = varyName(category, deriveSeed(seed, "shown"));

  return {
    request: pickWording([() => `Rename the ${shown} category to ${name}`, () => `Call ${shown} ${name} from now on`, () => `Change the category name ${shown} to ${name}`], deriveSeed(seed, "wording")),
    setup: [],
    steps: [{ type: "rename", target: "category", name: category, to: name }],
  };
};

/** Builds a goal that moves one seeder to another category. */
const buildMoveSeederGoal: GoalBuilder = (state, seed) => {
  const placed = pickSeeder(state, deriveSeed(seed, "seeder"));
  const to = pickOne(Object.keys(state.categories).filter((name) => name !== placed.category), "another category", deriveSeed(seed, "to"));
  const shown = varyName(placed.seeder, deriveSeed(seed, "shown"));
  const target = varyName(to, deriveSeed(seed, "target"));

  return {
    request: pickWording([() => `Move ${shown} to ${target}`, () => `${shown} belongs in ${target}`, () => `Put ${shown} under ${target}`, () => `Move the ${shown} seeder from ${placed.category} to ${target}`], deriveSeed(seed, "wording")),
    setup: [],
    steps: [{ type: "moveSeeders", targets: { seeders: [placed.seeder] }, toCategory: to }],
  };
};

/** Builds a goal that moves two or three seeders of one category to another. */
const buildMoveSeedersGoal: GoalBuilder = (state, seed) => {
  const from = pickOne(listCategories(state, 3), "a category with three seeders", deriveSeed(seed, "from"));
  const seeders = pickSome(listSeedersIn(state, from), 2, 3, deriveSeed(seed, "seeders"));
  const to = pickOne(Object.keys(state.categories).filter((name) => name !== from), "another category", deriveSeed(seed, "to"));
  const shown = formatNames(seeders, deriveSeed(seed, "shown"));
  const target = varyName(to, deriveSeed(seed, "target"));

  return {
    request: pickWording([() => `Move ${shown} to ${target}`, () => `${shown} belong in ${target}`, () => `Put ${shown} under ${target}`], deriveSeed(seed, "wording")),
    setup: [],
    steps: [{ type: "moveSeeders", targets: { seeders }, toCategory: to }],
  };
};

/** Builds a goal that merges one category into another. */
const buildMergeCategoryGoal: GoalBuilder = (state, seed) => {
  const [category = "", into = ""] = pickSome(Object.keys(state.categories), 2, 2, deriveSeed(seed, "pair"));
  const from = varyName(category, deriveSeed(seed, "from"));
  const target = varyName(into, deriveSeed(seed, "into"));

  return {
    request: pickWording([() => `Merge ${from} into ${target}`, () => `Fold ${from} into ${target}`, () => `Move everything from ${from} into ${target} and drop ${from}`], deriveSeed(seed, "wording")),
    setup: [],
    steps: [{ type: "mergeCategory", category, into }],
  };
};

/** Builds a goal that deletes a category. */
const buildDeleteCategoryGoal: GoalBuilder = (state, seed) => {
  const category = pickOne(Object.keys(state.categories), "a category", deriveSeed(seed, "category"));
  const shown = varyName(category, deriveSeed(seed, "shown"));

  return {
    request: pickWording([() => `Delete the ${shown} category`, () => `Remove ${shown}`, () => `Get rid of ${shown} entirely`], deriveSeed(seed, "wording")),
    setup: [],
    steps: [{ type: "deleteCategory", category }],
  };
};

/** Builds a goal that deletes one seeder. */
const buildDeleteSeederGoal: GoalBuilder = (state, seed) => {
  const { seeder } = pickSeeder(state, deriveSeed(seed, "seeder"));
  const shown = varyName(seeder, deriveSeed(seed, "shown"));

  return {
    request: pickWording([() => `Delete ${shown}`, () => `Remove the ${shown} seeder`, () => `Get rid of ${shown}`], deriveSeed(seed, "wording")),
    setup: [],
    steps: [{ type: "deleteSeeders", targets: { seeders: [seeder] } }],
  };
};

/** Builds a goal that deletes two or three seeders. */
const buildDeleteSeedersGoal: GoalBuilder = (state, seed) => {
  const category = pickOne(listCategories(state, 3), "a category with three seeders", deriveSeed(seed, "category"));
  const seeders = pickSome(listSeedersIn(state, category), 2, 3, deriveSeed(seed, "seeders"));
  const shown = formatNames(seeders, deriveSeed(seed, "shown"));

  return {
    request: pickWording([() => `Delete ${shown}`, () => `Remove the seeders ${shown}`, () => `Get rid of ${shown}`], deriveSeed(seed, "wording")),
    setup: [],
    steps: [{ type: "deleteSeeders", targets: { seeders } }],
  };
};

/** Goals that create, rename, move, merge or delete categories and seeders. */
export const STRUCTURE_GOALS: Readonly<Record<string, GoalBuilder>> = {
  "create-category": buildCreateCategoryGoal,
  "create-seeder": buildCreateSeederGoal,
  "create-seeder-with": buildCreateSeederWithGoal,
  "rename-seeder": buildRenameSeederGoal,
  "rename-category": buildRenameCategoryGoal,
  "move-seeder": buildMoveSeederGoal,
  "move-seeders": buildMoveSeedersGoal,
  "merge-category": buildMergeCategoryGoal,
  "delete-category": buildDeleteCategoryGoal,
  "delete-seeder": buildDeleteSeederGoal,
  "delete-seeders": buildDeleteSeedersGoal,
};
