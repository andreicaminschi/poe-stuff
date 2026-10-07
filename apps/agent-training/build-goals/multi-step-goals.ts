import type { GoalBuilder } from "../types.ts";
import { deriveSeed } from "./derive-seed.ts";
import { drawNewName, drawTag, listCategories, listSeedersIn, pickOne, pickSeeder, pickSome } from "./pick.ts";
import { drawTargets } from "./targets.ts";
import { formatList, formatNames, pickWording, varyName, withArticle } from "./word.ts";

/** Builds a goal that creates a category and moves two or three seeders into it. */
const buildCreateAndMoveGoal: GoalBuilder = (state, seed) => {
  const name = drawNewName(state, deriveSeed(seed, "name"));
  const category = pickOne(listCategories(state, 3), "a category with three seeders", deriveSeed(seed, "from"));
  const seeders = pickSome(listSeedersIn(state, category), 2, 3, deriveSeed(seed, "seeders"));
  const shown = formatNames(seeders, deriveSeed(seed, "shown"));

  return {
    request: pickWording([
      () => `Create ${withArticle(name)} category and move ${shown} into it`,
      () => `Create category ${name} and move ${shown} into it`,
      () => `Create ${name} and put ${shown} in it`,
      () => `Create a new category ${name}, then move ${shown} there`,
      () => `Please create ${withArticle(name)} category and move ${shown} into it`,
      () => `Make a new category ${name}, then put ${shown} there`,
      () => `Make a category ${name} and shift ${shown} over to it`,
      () => `Add category ${name} and move ${shown} over`,
      () => `Add a category ${name} and put ${shown} under it`,
      () => `Set up ${withArticle(name)} category, then move ${shown} in`,
      () => `Start a category ${name} and move ${shown} into it`,
      () => `Create ${name}, then ${shown} go into ${name}`,
      () => `Move ${shown} into a new category ${name}`,
      () => `Put ${shown} in a new category called ${name}`,
      () => `Move ${shown} to a new ${name} category`,
      () => `New category ${name}, with ${shown} moved into it`,
      () => `Can you create ${name} and move ${shown} into it?`,
      () => `I need ${withArticle(name)} category holding ${shown}`,
      () => `Could you make a category ${name} and move ${shown} there?`,
      () => `I want ${shown} in a new category ${name}`,
      () => `I'd like a new category ${name} with ${shown} in it`,
      () => `${shown} should go in a new category ${name}`,
    ], deriveSeed(seed, "wording")),
    setup: [],
    steps: [{ type: "createCategory", category: name }, { type: "moveSeeders", targets: { seeders }, toCategory: name }],
  };
};

/** Builds a goal that creates a category with one seeder in it. */
const buildCreateCategoryAndSeederGoal: GoalBuilder = (state, seed) => {
  const category = drawNewName(state, deriveSeed(seed, "category"));
  const seeder = drawNewName(state, deriveSeed(seed, "seeder"));

  return {
    request: pickWording([
      () => `Create a category ${category} with a seeder called ${seeder}`,
      () => `Create category ${category} and add a seeder ${seeder} to it`,
      () => `Create ${category}, then add a seeder ${seeder} to it`,
      () => `Please create a category ${category} with a seeder ${seeder}`,
      () => `Add category ${category} and give it ${withArticle(seeder)} seeder`,
      () => `Add a new category ${category} with the seeder ${seeder}`,
      () => `Make ${withArticle(category)} category and create ${seeder} in it`,
      () => `Make a category ${category} with one seeder, ${seeder}`,
      () => `Set up ${category} with one seeder, ${seeder}`,
      () => `Start a category ${category} and put a seeder ${seeder} in it`,
      () => `Create a seeder ${seeder} in a new category ${category}`,
      () => `Put a new seeder ${seeder} in a new category ${category}`,
      () => `New category ${category}, with a new seeder ${seeder} inside`,
      () => `Can you add a category ${category} with seeder ${seeder}?`,
      () => `I need a new category ${category} containing a seeder ${seeder}`,
      () => `Could you create a category ${category} with a seeder ${seeder}?`,
      () => `I want a category ${category} with a seeder ${seeder} in it`,
      () => `I'd like a new category ${category} holding a seeder ${seeder}`,
      () => `There should be a category ${category} with a seeder ${seeder}`,
    ], deriveSeed(seed, "wording")),
    setup: [],
    steps: [{ type: "createCategory", category }, { type: "createSeeder", category, seeder }],
  };
};

/** Builds a goal that renames a seeder and then tags it. */
const buildRenameAndTagGoal: GoalBuilder = (state, seed) => {
  const { seeder } = pickSeeder(state, deriveSeed(seed, "seeder"));
  const name = drawNewName(state, deriveSeed(seed, "name"));
  const tag = drawTag(deriveSeed(seed, "tag"));
  const shown = varyName(seeder, deriveSeed(seed, "shown"));

  return {
    request: pickWording([
      () => `Rename ${shown} to ${name} and tag it ${tag}`,
      () => `Rename ${shown} → ${name}, then tag it ${tag}`,
      () => `Rename ${shown} as ${name} and give it the ${tag} tag`,
      () => `Rename ${shown} to ${name}, then mark it as ${tag}`,
      () => `Rename ${shown} to ${name} and label it ${tag}`,
      () => `Rename ${shown} to ${name} and flag it as ${tag}`,
      () => `Rename ${shown} to ${name}, then put the ${tag} tag on it`,
      () => `Please rename ${shown} to ${name} and tag it ${tag}`,
      () => `First rename ${shown} to ${name}, then mark it as ${tag}`,
      () => `Call ${shown} ${name} from now on, and mark it as ${tag}`,
      () => `Call ${shown} ${name} and tag it ${tag}`,
      () => `Change the name of ${shown} to ${name}, then add the ${tag} tag`,
      () => `Change ${shown}'s name to ${name} and tag it ${tag}`,
      () => `Give ${shown} the name ${name} and the ${tag} tag`,
      () => `${shown} should be called ${name} and tagged ${tag}`,
      () => `Can you rename ${shown} to ${name} and tag it ${tag}?`,
      () => `Could you rename ${shown} to ${name} and mark it ${tag}?`,
      () => `I want ${shown} renamed to ${name} and tagged ${tag}`,
      () => `I'd like ${shown} called ${name}, with the ${tag} tag`,
    ], deriveSeed(seed, "wording")),
    setup: [],
    steps: [{ type: "rename", target: "seeder", name: seeder, to: name }, { type: "updateSeeders", targets: { seeders: [name] }, add: { tags: [tag] } }],
  };
};

/** Builds a goal that puts two different tags on two different targets. */
const buildTwoTagsGoal: GoalBuilder = (state, seed) => {
  const first = drawTargets(state, "category", deriveSeed(seed, "first"));
  const second = drawTargets(state, "seeders", deriveSeed(seed, "second"));
  const firstTag = drawTag(deriveSeed(seed, "first-tag"));
  const secondTag = drawTag(deriveSeed(seed, "second-tag"));

  return {
    request: pickWording([
      () => `Tag ${first.phrase} as ${firstTag} and ${second.phrase} as ${secondTag}`,
      () => `Tag ${first.phrase} as ${firstTag}, then tag ${second.phrase} as ${secondTag}`,
      () => `Tag ${first.phrase} with ${firstTag} and ${second.phrase} with ${secondTag}`,
      () => `Tag ${first.phrase} as ${firstTag}. Tag ${second.phrase} as ${secondTag}`,
      () => `Tag ${first.phrase} as ${firstTag}; tag ${second.phrase} as ${secondTag}`,
      () => `Please tag ${first.phrase} as ${firstTag} and ${second.phrase} as ${secondTag}`,
      () => `Mark ${first.phrase} as ${firstTag}, and ${second.phrase} as ${secondTag}`,
      () => `Mark ${first.phrase} ${firstTag} and ${second.phrase} ${secondTag}`,
      () => `Give ${first.phrase} the ${firstTag} tag and ${second.phrase} the ${secondTag} tag`,
      () => `Put ${firstTag} on ${first.phrase} and ${secondTag} on ${second.phrase}`,
      () => `Add ${firstTag} to ${first.phrase} and ${secondTag} to ${second.phrase}`,
      () => `Add the ${firstTag} tag to ${first.phrase} and the ${secondTag} tag to ${second.phrase}`,
      () => `Label ${first.phrase} as ${firstTag} and ${second.phrase} as ${secondTag}`,
      () => `Flag ${first.phrase} as ${firstTag} and ${second.phrase} as ${secondTag}`,
      () => `${first.phrase} gets the ${firstTag} tag, ${second.phrase} gets ${secondTag}`,
      () => `Can you tag ${first.phrase} as ${firstTag} and ${second.phrase} as ${secondTag}?`,
      () => `Could you mark ${first.phrase} as ${firstTag} and ${second.phrase} as ${secondTag}?`,
      () => `I want ${first.phrase} tagged ${firstTag} and ${second.phrase} tagged ${secondTag}`,
      () => `${first.phrase} should be ${firstTag} and ${second.phrase} should be ${secondTag}`,
      () => `I'd like ${firstTag} on ${first.phrase} and ${secondTag} on ${second.phrase}`,
    ], deriveSeed(seed, "wording")),
    setup: [],
    steps: [
      { type: "updateSeeders", targets: first.targets, add: { tags: [firstTag] } },
      { type: "updateSeeders", targets: second.targets, add: { tags: [secondTag] } },
    ],
  };
};

/** Builds a goal that deletes one seeder and moves another. */
const buildDeleteAndMoveGoal: GoalBuilder = (state, seed) => {
  const gone = pickSeeder(state, deriveSeed(seed, "gone"));
  const moved = pickSeeder(state, deriveSeed(seed, "moved"), (placed) => placed.seeder !== gone.seeder);
  const to = pickOne(Object.keys(state.categories).filter((name) => name !== moved.category), "another category", deriveSeed(seed, "to"));
  const goneShown = varyName(gone.seeder, deriveSeed(seed, "gone-shown"));
  const movedShown = varyName(moved.seeder, deriveSeed(seed, "moved-shown"));
  const target = varyName(to, deriveSeed(seed, "target"));

  return {
    request: pickWording([
      () => `Delete ${goneShown} and move ${movedShown} to ${target}`,
      () => `Delete ${goneShown}, then relocate ${movedShown} to ${target}`,
      () => `First delete ${goneShown}, then move ${movedShown} to ${target}`,
      () => `Please delete ${goneShown} and move ${movedShown} to ${target}`,
      () => `Delete ${goneShown} and transfer ${movedShown} to ${target}`,
      () => `Delete the ${goneShown} seeder and put ${movedShown} under ${target}`,
      () => `Remove ${goneShown} and move ${movedShown} into ${target}`,
      () => `Remove ${goneShown}, then put ${movedShown} in ${target}`,
      () => `Get rid of ${goneShown}, then put ${movedShown} under ${target}`,
      () => `Drop ${goneShown}; ${movedShown} goes to ${target}`,
      () => `Drop ${goneShown} and shift ${movedShown} to ${target}`,
      () => `Trash ${goneShown} and send ${movedShown} to ${target}`,
      () => `Scrap ${goneShown} and move ${movedShown} over to ${target}`,
      () => `Can you delete ${goneShown} and move ${movedShown} to ${target}?`,
      () => `${goneShown} can go, and ${movedShown} belongs in ${target}`,
      () => `Could you remove ${goneShown} and move ${movedShown} to ${target}?`,
      () => `I want ${goneShown} gone and ${movedShown} moved to ${target}`,
      () => `I'd like ${goneShown} deleted and ${movedShown} in ${target}`,
    ], deriveSeed(seed, "wording")),
    setup: [],
    steps: [{ type: "deleteSeeders", targets: { seeders: [gone.seeder] } }, { type: "moveSeeders", targets: { seeders: [moved.seeder] }, toCategory: to }],
  };
};

/** Builds a goal that tags a seeder and some items with the same tag. */
const buildTagSeederAndItemsGoal: GoalBuilder = (state, seed) => {
  const { seeder } = pickSeeder(state, deriveSeed(seed, "seeder"));
  const items = pickSome(Object.keys(state.items), 1, 2, deriveSeed(seed, "items"));
  const tag = drawTag(deriveSeed(seed, "tag"));
  const shown = varyName(seeder, deriveSeed(seed, "shown"));

  return {
    request: pickWording([
      () => `Tag ${shown} and the items ${formatList(items)} as ${tag}`,
      () => `Tag the seeder ${shown} as ${tag}, and also the items ${formatList(items)}`,
      () => `Tag ${shown} as ${tag}, and the items ${formatList(items)} too`,
      () => `Tag ${shown} plus the items ${formatList(items)} with ${tag}`,
      () => `Please tag ${shown} and the items ${formatList(items)} as ${tag}`,
      () => `Mark the seeder ${shown} as ${tag}, and the items ${formatList(items)} too`,
      () => `Mark ${shown} and the items ${formatList(items)} as ${tag}`,
      () => `Give ${shown} and the items ${formatList(items)} the ${tag} tag`,
      () => `Put ${tag} on ${shown} and on the items ${formatList(items)}`,
      () => `Add ${tag} to ${shown} and to the items ${formatList(items)}`,
      () => `Add the ${tag} tag to ${shown} and the items ${formatList(items)}`,
      () => `Label ${shown} and the items ${formatList(items)} as ${tag}`,
      () => `Can you tag ${shown} and the items ${formatList(items)} as ${tag}?`,
      () => `${shown} and the items ${formatList(items)} should be tagged ${tag}`,
      () => `Could you mark ${shown} and the items ${formatList(items)} as ${tag}?`,
      () => `I want ${shown} and the items ${formatList(items)} tagged ${tag}`,
      () => `I'd like ${tag} on ${shown} and the items ${formatList(items)}`,
    ], deriveSeed(seed, "wording")),
    setup: [],
    steps: [{ type: "updateSeeders", targets: { seeders: [seeder] }, add: { tags: [tag] } }, { type: "updateItems", items, add: { tags: [tag] } }],
  };
};

/** Builds a goal that creates a category, moves seeders into it and tags them. */
const buildCreateMoveTagGoal: GoalBuilder = (state, seed) => {
  const name = drawNewName(state, deriveSeed(seed, "name"));
  const category = pickOne(listCategories(state, 3), "a category with three seeders", deriveSeed(seed, "from"));
  const seeders = pickSome(listSeedersIn(state, category), 2, 3, deriveSeed(seed, "seeders"));
  const tag = drawTag(deriveSeed(seed, "tag"));
  const shown = formatNames(seeders, deriveSeed(seed, "shown"));

  return {
    request: pickWording([
      () => `Create ${name}, move ${shown} into it and tag them ${tag}`,
      () => `Create category ${name}, move ${shown} over, and tag everything in it ${tag}`,
      () => `Create a new category ${name}, put ${shown} there and mark them as ${tag}`,
      () => `Create ${name} for ${shown} and tag everything in it ${tag}`,
      () => `Please create ${name}, move ${shown} into it and tag them ${tag}`,
      () => `Make ${withArticle(name)} category, move ${shown} in, then tag them ${tag}`,
      () => `Make a category ${name}, put ${shown} in it and mark them ${tag}`,
      () => `Add a category ${name}, move ${shown} there and tag them ${tag}`,
      () => `Set up ${name} with ${shown} moved in, all tagged ${tag}`,
      () => `Start a category ${name}, move ${shown} into it and label them ${tag}`,
      () => `Put ${shown} into a new category ${name} and tag them ${tag}`,
      () => `Move ${shown} into a new category ${name} and mark them as ${tag}`,
      () => `New category ${name} for ${shown}, tagged ${tag}`,
      () => `Can you create ${name}, move ${shown} into it and tag them ${tag}?`,
      () => `Could you make a category ${name} with ${shown} in it, all tagged ${tag}?`,
      () => `I want ${shown} in a new category ${name}, tagged ${tag}`,
      () => `I'd like a new category ${name} holding ${shown}, all marked ${tag}`,
    ], deriveSeed(seed, "wording")),
    setup: [],
    steps: [
      { type: "createCategory", category: name },
      { type: "moveSeeders", targets: { seeders }, toCategory: name },
      { type: "updateSeeders", targets: { categories: [name] }, add: { tags: [tag] } },
    ],
  };
};

/** Goals that need two or three commands. */
export const MULTI_STEP_GOALS: Readonly<Record<string, GoalBuilder>> = {
  "create-category-and-move": buildCreateAndMoveGoal,
  "create-category-and-seeder": buildCreateCategoryAndSeederGoal,
  "rename-and-tag": buildRenameAndTagGoal,
  "two-tags": buildTwoTagsGoal,
  "delete-and-move": buildDeleteAndMoveGoal,
  "tag-seeder-and-items": buildTagSeederAndItemsGoal,
  "create-move-tag": buildCreateMoveTagGoal,
};
