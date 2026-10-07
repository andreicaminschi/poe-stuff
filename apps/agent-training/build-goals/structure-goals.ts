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
    request: pickWording([
      () => `Create a category called ${name}`,
      () => `Create a category ${name}`,
      () => `Create the category ${name}`,
      () => `Create category ${name}`,
      () => `Create a new category named ${name}`,
      () => `Please create a category ${name}`,
      () => `Add a new category ${name}`,
      () => `Add category ${name}`,
      () => `Add a category called ${name}`,
      () => `Make a category named ${name}`,
      () => `Make a new category ${name}`,
      () => `Start a new ${name} category`,
      () => `Start a category called ${name}`,
      () => `Set up a category ${name}`,
      () => `Build a category ${name}`,
      () => `I need ${withArticle(name)} category`,
      () => `Can you add a category ${name}?`,
      () => `Could you create a category called ${name}?`,
      () => `I want a new category ${name}`,
      () => `I'd like a category named ${name}`,
      () => `We need a category called ${name}`,
      () => `There should be a category ${name}`,
      () => `Can we get ${withArticle(name)} category?`,
      () => `Would you make a category ${name}?`,
    ], deriveSeed(seed, "wording")),
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
    request: pickWording([
      () => `Create a seeder ${name} in ${shown}`,
      () => `Create seeder ${name} in ${shown}`,
      () => `Create a new seeder called ${name} in ${shown}`,
      () => `Please create a seeder ${name} in ${shown}`,
      () => `Add ${withArticle(name)} seeder to ${shown}`,
      () => `Add seeder ${name} to ${shown}`,
      () => `Add a new seeder ${name} to ${shown}`,
      () => `Add a new seeder ${name} under ${shown}`,
      () => `Make a seeder named ${name} under ${shown}`,
      () => `Make a new seeder ${name} in ${shown}`,
      () => `Put a new ${name} seeder in ${shown}`,
      () => `Start a seeder ${name} in ${shown}`,
      () => `Set up a seeder ${name} in ${shown}`,
      () => `In ${shown}, create a seeder ${name}`,
      () => `Under ${shown}, add a seeder called ${name}`,
      () => `New seeder ${name} in ${shown}`,
      () => `${shown} needs a new seeder called ${name}`,
      () => `Can you add seeder ${name} to ${shown}?`,
      () => `Could you create a seeder ${name} in ${shown}?`,
      () => `I want a seeder ${name} in ${shown}`,
      () => `I'd like a new seeder called ${name} under ${shown}`,
      () => `There should be a seeder ${name} in ${shown}`,
      () => `Can we get ${withArticle(name)} seeder in ${shown}?`,
      () => `Would you add a seeder ${name} to ${shown}?`,
    ], deriveSeed(seed, "wording")),
    setup: [],
    steps: [{ type: "createSeeder", category, seeder: name }],
  };
};

/** Builds a create-seeder goal whose new seeder already carries a tag. */
function buildCreateSeederWithTag(category: string, name: string, shown: string, seed: number): GoalDraft {
  const tag = drawTag(deriveSeed(seed, "tag"));

  return {
    request: pickWording([
      () => `Create ${withArticle(name)} seeder in ${shown}, tagged ${tag}`,
      () => `Create a seeder ${name} in ${shown} with the tag ${tag}`,
      () => `Create seeder ${name} in ${shown} and tag it ${tag}`,
      () => `Please create a seeder ${name} in ${shown} tagged ${tag}`,
      () => `Add seeder ${name} to ${shown} with the tag ${tag}`,
      () => `Add ${withArticle(name)} seeder to ${shown} that is tagged ${tag}`,
      () => `Add a new seeder ${name} to ${shown} tagged ${tag}`,
      () => `Add a new seeder ${name} to ${shown} and tag it ${tag}`,
      () => `Make a seeder ${name} under ${shown}, tag ${tag}`,
      () => `Make a seeder ${name} in ${shown} and mark it ${tag}`,
      () => `Set up a seeder ${name} in ${shown} with the ${tag} tag`,
      () => `Put a new seeder ${name} in ${shown}, tagged ${tag}`,
      () => `Start a seeder ${name} in ${shown} with tag ${tag}`,
      () => `New seeder ${name} in ${shown}, tagged ${tag}`,
      () => `${shown} needs a seeder ${name} with the ${tag} tag`,
      () => `Can you create ${name} in ${shown} with tag ${tag}?`,
      () => `I want a seeder ${name} in ${shown} tagged ${tag}`,
      () => `Could you add a seeder ${name} to ${shown} with the ${tag} tag?`,
      () => `I'd like a new ${tag} seeder ${name} in ${shown}`,
      () => `There should be a seeder ${name} in ${shown} tagged ${tag}`,
    ], deriveSeed(seed, "wording")),
    setup: [],
    steps: [{ type: "createSeeder", category, seeder: name, add: { tags: [tag] } }],
  };
}

/** Builds a create-seeder goal whose new seeder already carries a condition. */
function buildCreateSeederWithCondition(category: string, name: string, shown: string, seed: number): GoalDraft {
  const change = drawConditionChange(deriveSeed(seed, "change"));

  return {
    request: pickWording([
      () => `Create ${withArticle(name)} seeder in ${shown} with ${change.phrase}`,
      () => `Create seeder ${name} in ${shown} requiring ${change.phrase}`,
      () => `Create a seeder ${name} in ${shown} for ${change.phrase} items`,
      () => `Please create a seeder ${name} in ${shown} with ${change.phrase}`,
      () => `Add seeder ${name} to ${shown}, requiring ${change.phrase}`,
      () => `Add ${withArticle(name)} seeder to ${shown} for ${change.phrase} items`,
      () => `Add a new seeder ${name} to ${shown} limited to ${change.phrase}`,
      () => `Add a new seeder ${name} to ${shown} with ${change.phrase}`,
      () => `Make a seeder ${name} under ${shown}, ${change.phrase} only`,
      () => `Make a seeder ${name} in ${shown} that requires ${change.phrase}`,
      () => `Set up a seeder ${name} in ${shown} with ${change.phrase}`,
      () => `Put a new seeder ${name} in ${shown} restricted to ${change.phrase}`,
      () => `Start a seeder ${name} in ${shown} for ${change.phrase}`,
      () => `New seeder ${name} in ${shown} that requires ${change.phrase}`,
      () => `${shown} needs a seeder ${name} limited to ${change.phrase}`,
      () => `Can you create ${name} in ${shown} with ${change.phrase}?`,
      () => `I want a seeder ${name} in ${shown} that requires ${change.phrase}`,
      () => `Could you add a seeder ${name} to ${shown} for ${change.phrase} items?`,
      () => `I'd like a new seeder ${name} in ${shown}, ${change.phrase} only`,
      () => `There should be a seeder ${name} in ${shown} requiring ${change.phrase}`,
    ], deriveSeed(seed, "wording")),
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
    request: pickWording([
      () => `Rename ${shown} to ${name}`,
      () => `Rename the seeder ${shown} to ${name}`,
      () => `Rename the seeder ${shown} → ${name}`,
      () => `Rename seeder ${shown} as ${name}`,
      () => `Please rename ${shown} to ${name}`,
      () => `Call the ${shown} seeder ${name}`,
      () => `Call ${shown} ${name} from now on`,
      () => `Change the name of ${shown} to ${name}`,
      () => `Change ${shown}'s name to ${name}`,
      () => `Give ${shown} the name ${name}`,
      () => `Give ${shown} a new name, ${name}`,
      () => `Name ${shown} ${name} instead`,
      () => `Switch the name of ${shown} to ${name}`,
      () => `Update the name of ${shown} to ${name}`,
      () => `Set the name of ${shown} to ${name}`,
      () => `Set ${shown}'s name to ${name}`,
      () => `${shown} should be named ${name}`,
      () => `${shown} is now called ${name}`,
      () => `Can you rename ${shown} to ${name}?`,
      () => `Could you call ${shown} ${name} instead?`,
      () => `I want ${shown} renamed to ${name}`,
      () => `I'd like ${shown} to be called ${name}`,
      () => `${shown} needs to be called ${name}`,
      () => `Can ${shown} be called ${name}?`,
      () => `Let's call ${shown} ${name}`,
    ], deriveSeed(seed, "wording")),
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
    request: pickWording([
      () => `Rename the ${shown} category to ${name}`,
      () => `Rename category ${shown} → ${name}`,
      () => `Rename ${shown} to ${name}`,
      () => `Rename category ${shown} to ${name}`,
      () => `Please rename the ${shown} category to ${name}`,
      () => `Call ${shown} ${name} from now on`,
      () => `Call the ${shown} category ${name}`,
      () => `Change the category name ${shown} to ${name}`,
      () => `Change the name of the ${shown} category to ${name}`,
      () => `Change ${shown}'s name to ${name}`,
      () => `Give the ${shown} category the name ${name}`,
      () => `Name the ${shown} category ${name} instead`,
      () => `Switch the name of category ${shown} to ${name}`,
      () => `Set the name of the ${shown} category to ${name}`,
      () => `Update category ${shown}'s name to ${name}`,
      () => `The ${shown} category should be called ${name}`,
      () => `${shown} is now ${name}`,
      () => `Can you rename the ${shown} category to ${name}?`,
      () => `Could you call the ${shown} category ${name}?`,
      () => `I want the ${shown} category renamed to ${name}`,
      () => `I'd like ${shown} to be called ${name}`,
      () => `Can the ${shown} category be called ${name}?`,
      () => `Let's call the ${shown} category ${name}`,
    ], deriveSeed(seed, "wording")),
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
    request: pickWording([
      () => `Move ${shown} to ${target}`,
      () => `Move ${shown} into ${target}`,
      () => `Move the ${shown} seeder from ${placed.category} to ${target}`,
      () => `Move ${shown} over to ${target}`,
      () => `Please move ${shown} to ${target}`,
      () => `Put ${shown} under ${target}`,
      () => `Put ${shown} in ${target}`,
      () => `Shift ${shown} over to ${target}`,
      () => `Shift ${shown} to ${target}`,
      () => `Relocate ${shown} to ${target}`,
      () => `Transfer ${shown} to ${target}`,
      () => `Send ${shown} to ${target}`,
      () => `Place ${shown} in ${target}`,
      () => `File ${shown} under ${target}`,
      () => `Take ${shown} out of ${placed.category} and put it in ${target}`,
      () => `${shown} → ${target}`,
      () => `${shown} belongs in ${target}`,
      () => `Can you move ${shown} into ${target}?`,
      () => `${shown} should be in ${target}`,
      () => `Could you put ${shown} under ${target}?`,
      () => `I want ${shown} moved to ${target}`,
      () => `I'd like ${shown} in ${target}`,
      () => `${shown} should live under ${target}`,
      () => `Can ${shown} go in ${target}?`,
      () => `${target} should hold ${shown}`,
    ], deriveSeed(seed, "wording")),
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
    request: pickWording([
      () => `Move ${shown} to ${target}`,
      () => `Move ${shown} into ${target}`,
      () => `Move ${shown} over to ${target}`,
      () => `Move all of ${shown} to ${target}`,
      () => `Please move ${shown} to ${target}`,
      () => `Put ${shown} under ${target}`,
      () => `Put ${shown} in ${target}`,
      () => `Shift ${shown} over to ${target}`,
      () => `Shift ${shown} to ${target}`,
      () => `Relocate ${shown} to ${target}`,
      () => `Transfer ${shown} to ${target}`,
      () => `Send ${shown} to ${target}`,
      () => `Place ${shown} in ${target}`,
      () => `File ${shown} under ${target}`,
      () => `${shown} → ${target}`,
      () => `${shown} belong in ${target}`,
      () => `Can you move ${shown} into ${target}?`,
      () => `${target} should hold ${shown}`,
      () => `${shown} should be in ${target}`,
      () => `Could you put ${shown} under ${target}?`,
      () => `I want ${shown} moved to ${target}`,
      () => `I'd like ${shown} in ${target}`,
      () => `Can ${shown} go in ${target}?`,
    ], deriveSeed(seed, "wording")),
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
    request: pickWording([
      () => `Merge ${from} into ${target}`,
      () => `Merge ${from} with ${target}, keeping ${target}`,
      () => `Merge the ${from} category into ${target}`,
      () => `Please merge ${from} into ${target}`,
      () => `Fold ${from} into ${target}`,
      () => `Fold the ${from} category into ${target}`,
      () => `Move everything from ${from} into ${target} and drop ${from}`,
      () => `Move all of ${from} into ${target} and delete ${from}`,
      () => `Combine ${from} with ${target}, keeping ${target}`,
      () => `Combine ${from} into ${target}`,
      () => `Absorb ${from} into ${target}`,
      () => `Join ${from} into ${target} and remove ${from}`,
      () => `Roll ${from} into ${target}`,
      () => `Fuse ${from} into ${target}`,
      () => `Collapse ${from} into ${target}`,
      () => `Put everything in ${from} under ${target} and remove ${from}`,
      () => `${from} should be part of ${target}`,
      () => `Can you merge ${from} into ${target}?`,
      () => `Could you fold ${from} into ${target}?`,
      () => `I want ${from} merged into ${target}`,
      () => `I'd like ${from} combined into ${target}`,
      () => `Can ${from} go into ${target}?`,
      () => `Let's merge ${from} into ${target}`,
    ], deriveSeed(seed, "wording")),
    setup: [],
    steps: [{ type: "mergeCategory", category, into }],
  };
};

/** Builds a goal that deletes a category. */
const buildDeleteCategoryGoal: GoalBuilder = (state, seed) => {
  const category = pickOne(Object.keys(state.categories), "a category", deriveSeed(seed, "category"));
  const shown = varyName(category, deriveSeed(seed, "shown"));

  return {
    request: pickWording([
      () => `Delete the ${shown} category`,
      () => `Delete category ${shown} and everything in it`,
      () => `Delete category ${shown}`,
      () => `Delete ${shown} entirely`,
      () => `Please delete the ${shown} category`,
      () => `Remove ${shown}`,
      () => `Remove the whole ${shown} category`,
      () => `Remove the ${shown} category`,
      () => `Get rid of ${shown} entirely`,
      () => `Get rid of the ${shown} category`,
      () => `Drop the ${shown} category`,
      () => `Drop ${shown} completely`,
      () => `Trash the ${shown} category`,
      () => `Kill the ${shown} category`,
      () => `Scrap the ${shown} category`,
      () => `Axe the ${shown} category`,
      () => `Erase the ${shown} category`,
      () => `${shown} isn't needed anymore, delete it`,
      () => `Can you delete the ${shown} category?`,
      () => `Could you remove the ${shown} category?`,
      () => `I want the ${shown} category gone`,
      () => `I don't need the ${shown} category anymore`,
      () => `I'd like ${shown} deleted`,
      () => `The ${shown} category can go`,
      () => `Can we get rid of ${shown}?`,
    ], deriveSeed(seed, "wording")),
    setup: [],
    steps: [{ type: "deleteCategory", category }],
  };
};

/** Builds a goal that deletes one seeder. */
const buildDeleteSeederGoal: GoalBuilder = (state, seed) => {
  const { seeder } = pickSeeder(state, deriveSeed(seed, "seeder"));
  const shown = varyName(seeder, deriveSeed(seed, "shown"));

  return {
    request: pickWording([
      () => `Delete ${shown}`,
      () => `Delete the seeder called ${shown}`,
      () => `Delete the ${shown} seeder`,
      () => `Delete seeder ${shown}`,
      () => `Please delete ${shown}`,
      () => `Remove the ${shown} seeder`,
      () => `Remove seeder ${shown}`,
      () => `Remove ${shown}`,
      () => `Get rid of ${shown}`,
      () => `Get rid of the ${shown} seeder`,
      () => `Drop ${shown}`,
      () => `Drop the ${shown} seeder`,
      () => `Trash ${shown}`,
      () => `Kill the ${shown} seeder`,
      () => `Scrap ${shown}`,
      () => `Axe ${shown}`,
      () => `Erase the ${shown} seeder`,
      () => `${shown} can go`,
      () => `Can you delete ${shown}?`,
      () => `Could you remove ${shown}?`,
      () => `I want ${shown} gone`,
      () => `I don't need ${shown} anymore`,
      () => `I'd like ${shown} deleted`,
      () => `${shown} isn't needed anymore`,
      () => `Can we get rid of ${shown}?`,
    ], deriveSeed(seed, "wording")),
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
    request: pickWording([
      () => `Delete ${shown}`,
      () => `Delete the seeders ${shown}`,
      () => `Please delete ${shown}`,
      () => `Remove the seeders ${shown}`,
      () => `Remove ${shown}`,
      () => `Remove ${shown}, all of them`,
      () => `Get rid of ${shown}`,
      () => `Get rid of the seeders ${shown}`,
      () => `Drop ${shown}`,
      () => `Drop the seeders ${shown}`,
      () => `Trash ${shown}`,
      () => `Scrap ${shown}`,
      () => `Axe ${shown}`,
      () => `Erase ${shown}`,
      () => `${shown} can go`,
      () => `Can you delete ${shown}?`,
      () => `Could you remove ${shown}?`,
      () => `I want ${shown} gone`,
      () => `I don't need ${shown} anymore`,
      () => `I'd like ${shown} deleted`,
      () => `${shown} aren't needed anymore`,
      () => `Can we get rid of ${shown}?`,
    ], deriveSeed(seed, "wording")),
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
