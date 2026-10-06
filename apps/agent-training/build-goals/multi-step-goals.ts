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
      () => `Make a new category ${name}, then put ${shown} there`,
      () => `New category ${name}, with ${shown} moved into it`,
      () => `Add category ${name} and move ${shown} over`,
      () => `Can you create ${name} and move ${shown} into it?`,
      () => `Set up ${withArticle(name)} category, then move ${shown} in`,
      () => `Create ${name}, then ${shown} go into ${name}`,
      () => `I need ${withArticle(name)} category holding ${shown}`,
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
      () => `Add category ${category} and give it ${withArticle(seeder)} seeder`,
      () => `New category ${category}, with a new seeder ${seeder} inside`,
      () => `Make ${withArticle(category)} category and create ${seeder} in it`,
      () => `Can you add a category ${category} with seeder ${seeder}?`,
      () => `Create ${category}, then add a seeder ${seeder} to it`,
      () => `Set up ${category} with one seeder, ${seeder}`,
      () => `I need a new category ${category} containing a seeder ${seeder}`,
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
      () => `Call ${shown} ${name} from now on, and mark it as ${tag}`,
      () => `Rename ${shown} → ${name}, then tag it ${tag}`,
      () => `${shown} should be called ${name} and tagged ${tag}`,
      () => `Can you rename ${shown} to ${name} and tag it ${tag}?`,
      () => `Change the name of ${shown} to ${name}, then add the ${tag} tag`,
      () => `First rename ${shown} to ${name}, then mark it as ${tag}`,
      () => `Rename ${shown} as ${name} and give it the ${tag} tag`,
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
      () => `Mark ${first.phrase} as ${firstTag}, and ${second.phrase} as ${secondTag}`,
      () => `${first.phrase} gets the ${firstTag} tag, ${second.phrase} gets ${secondTag}`,
      () => `Tag ${first.phrase} as ${firstTag}; tag ${second.phrase} as ${secondTag}`,
      () => `Can you tag ${first.phrase} as ${firstTag} and ${second.phrase} as ${secondTag}?`,
      () => `Give ${first.phrase} the ${firstTag} tag and ${second.phrase} the ${secondTag} tag`,
      () => `Put ${firstTag} on ${first.phrase} and ${secondTag} on ${second.phrase}`,
      () => `${first.phrase}: tag ${firstTag}. ${second.phrase}: tag ${secondTag}`,
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
      () => `Get rid of ${goneShown}, then put ${movedShown} under ${target}`,
      () => `Remove ${goneShown} and move ${movedShown} into ${target}`,
      () => `Drop ${goneShown}; ${movedShown} goes to ${target}`,
      () => `Can you delete ${goneShown} and move ${movedShown} to ${target}?`,
      () => `Delete ${goneShown}, then relocate ${movedShown} to ${target}`,
      () => `${goneShown} can go, and ${movedShown} belongs in ${target}`,
      () => `First delete ${goneShown}, then move ${movedShown} to ${target}`,
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
      () => `Mark the seeder ${shown} as ${tag}, and the items ${formatList(items)} too`,
      () => `Give ${shown} and the items ${formatList(items)} the ${tag} tag`,
      () => `${shown} plus the items ${formatList(items)}: tag ${tag}`,
      () => `Can you tag ${shown} and the items ${formatList(items)} as ${tag}?`,
      () => `Tag the seeder ${shown} as ${tag}, and also the items ${formatList(items)}`,
      () => `Put ${tag} on ${shown} and on the items ${formatList(items)}`,
      () => `${shown} and the items ${formatList(items)} should be tagged ${tag}`,
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
      () => `New category ${name}: put ${shown} there and mark them as ${tag}`,
      () => `Make ${withArticle(name)} category, move ${shown} in, then tag them ${tag}`,
      () => `Can you create ${name}, move ${shown} into it and tag them ${tag}?`,
      () => `Set up ${name} with ${shown} moved in, all tagged ${tag}`,
      () => `Create category ${name}, move ${shown} over, and tag everything in it ${tag}`,
      () => `Put ${shown} into a new category ${name} and tag them ${tag}`,
      () => `New category ${name} for ${shown}, tagged ${tag}`,
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
