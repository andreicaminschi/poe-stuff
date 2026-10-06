import type { GoalBuilder } from "../types.ts";
import { createFaker, deriveSeed } from "./derive-seed.ts";
import { drawNewName, drawTag, pickOne, pickSeeder } from "./pick.ts";
import { STRUCTURE_GOALS } from "./structure-goals.ts";
import { TAG_GOALS } from "./tag-goals.ts";
import { lowerFirst, pickWording, varyName } from "./word.ts";

/** More commands than this in one request make it too big: the Router answers `rephrase`. */
export const MAX_STEPS = 3;

/** Single-step goals whose wording is reused to build requests that ask for too much. */
const PARTS: readonly GoalBuilder[] = [
  TAG_GOALS["tag-seeder"],
  STRUCTURE_GOALS["delete-seeder"],
  STRUCTURE_GOALS["rename-seeder"],
  STRUCTURE_GOALS["create-category"],
  STRUCTURE_GOALS["move-seeder"],
].filter((builder): builder is GoalBuilder => builder !== undefined);

/** Builds a request that asks for more separate actions than one plan may hold. */
const buildTooManyGoal: GoalBuilder = (state, seed) => {
  const count = createFaker(deriveSeed(seed, "count")).number.int({ min: MAX_STEPS + 1, max: MAX_STEPS + 2 });
  const requests = Array.from({ length: count }, (_, index) => pickOne(PARTS, "a part", deriveSeed(seed, `part-${index}`))(state, deriveSeed(seed, `request-${index}`)).request);
  const joiner = pickOne([", ", ", then ", ", and ", "; also "], "a joiner", deriveSeed(seed, "joiner"));

  return { request: requests.map((request, index) => (index === 0
    ? request
    : lowerFirst(request))).join(joiner), setup: [], steps: [] };
};

/** Builds a request that names a seeder the state does not hold. */
const buildUnknownNameGoal: GoalBuilder = (state, seed) => {
  const name = drawNewName(state, deriveSeed(seed, "name"));
  const tag = drawTag(deriveSeed(seed, "tag"));
  const category = pickOne(Object.keys(state.categories), "a category", deriveSeed(seed, "category"));
  const renamed = drawNewName(state, deriveSeed(seed, "renamed"));

  return {
    request: pickWording([
      () => `Tag ${name} as ${tag}`,
      () => `Delete the ${name} seeder`,
      () => `Move ${name} to ${category}`,
      () => `Rename ${name} to ${renamed}`,
      () => `Give ${name} the ${tag} tag`,
      () => `Remove the ${tag} tag from ${name}`,
      () => `Put ${name} under ${category}`,
      () => `${name} should be named ${renamed}`,
    ], deriveSeed(seed, "wording")),
    setup: [],
    steps: [],
  };
};

/** Builds a request no command can answer: a question, a UI action, or something too vague. */
const buildOffTopicGoal: GoalBuilder = (state, seed) => {
  const { seeder, category } = pickSeeder(state, deriveSeed(seed, "seeder"));
  const item = pickOne(Object.keys(state.items), "an item", deriveSeed(seed, "item"));
  const seederShown = varyName(seeder, deriveSeed(seed, "seeder-shown"));
  const categoryShown = varyName(category, deriveSeed(seed, "category-shown"));
  const sentence = createFaker(deriveSeed(seed, "sentence")).lorem.sentence();

  return {
    request: pickWording([
      () => `What's ${item} worth?`,
      () => `How many seeders are in ${categoryShown}?`,
      () => `Make the filter look nicer`,
      () => `Show me ${seederShown}`,
      () => `Open the ${categoryShown} category`,
      () => `Undo that`,
      () => `What does ${seederShown} do?`,
      () => `Fix everything`,
      () => sentence,
      () => `How much is ${item} worth right now?`,
      () => `Is ${item} valuable?`,
      () => `Which seeders does ${categoryShown} have?`,
      () => `List the seeders in ${categoryShown}`,
      () => `Where is ${seederShown}?`,
      () => `What's in ${seederShown}?`,
      () => `Why is ${item} hidden?`,
      () => `Does ${seederShown} catch ${item}?`,
      () => `Explain ${seederShown} to me`,
      () => `Go back`,
      () => `Revert the last change`,
      () => `Save`,
      () => `Close this`,
      () => `Search for ${item}`,
      () => `Sort ${categoryShown} by name`,
      () => `Make it better`,
      () => `Clean up ${categoryShown}`,
      () => `Thanks!`,
      () => `Hello?`,
      () => `Can you help me with ${categoryShown}?`,
      () => `What should I do with ${item}?`,
    ], deriveSeed(seed, "wording")),
    setup: [],
    steps: [],
  };
};

/** Requests the Router must refuse with `rephrase`. They carry no steps. */
export const REPHRASE_GOALS: Readonly<Record<string, GoalBuilder>> = {
  "too-many": buildTooManyGoal,
  "unknown-name": buildUnknownNameGoal,
  "off-topic": buildOffTopicGoal,
};
