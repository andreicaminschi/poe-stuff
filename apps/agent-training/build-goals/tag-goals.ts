import type { PanelState } from "@poe/panel-state/types";
import type { GoalBuilder } from "../types.ts";
import { deriveSeed } from "./derive-seed.ts";
import { drawTag } from "./pick.ts";
import { drawTargets, type TargetShape } from "./targets.ts";
import { pickWording } from "./word.ts";

/** Words a request to add a tag. */
const wordTagRequest = (phrase: string, tag: string, seed: number): string => pickWording([
  () => `Tag ${phrase} as ${tag}`,
  () => `Add the ${tag} tag to ${phrase}`,
  () => `Mark ${phrase} as ${tag}`,
  () => `Put the tag "${tag}" on ${phrase}`,
  () => `Give ${phrase} the ${tag} tag`,
  () => `${phrase} should be tagged ${tag}`,
  () => `Can you tag ${phrase} as ${tag}?`,
  () => `${phrase}: tag ${tag}`,
  () => `I want ${phrase} tagged ${tag}`,
], seed);

/** Words a request to remove a tag. */
const wordUntagRequest = (phrase: string, tag: string, seed: number): string => pickWording([
  () => `Remove the ${tag} tag from ${phrase}`,
  () => `Untag ${tag} on ${phrase}`,
  () => `Drop tag ${tag} from ${phrase}`,
  () => `${phrase} shouldn't be tagged ${tag} anymore`,
  () => `Take the ${tag} tag off ${phrase}`,
  () => `Clear the ${tag} tag on ${phrase}`,
  () => `${phrase}: remove tag ${tag}`,
  () => `Stop tagging ${phrase} as ${tag}`,
], seed);

/** Builds a goal that tags seeders in one target shape. */
const buildTagGoal = (shape: TargetShape): GoalBuilder => (state: PanelState, seed: number) => {
  const { targets, phrase } = drawTargets(state, shape, deriveSeed(seed, "targets"));
  const tag = drawTag(deriveSeed(seed, "tag"));

  return {
    request: wordTagRequest(phrase, tag, deriveSeed(seed, "wording")),
    setup: [],
    steps: [{ type: "updateSeeders", targets, add: { tags: [tag] } }],
  };
};

/** Builds a goal that removes a tag the setup put on seeders in one target shape. */
const buildUntagGoal = (shape: TargetShape): GoalBuilder => (state: PanelState, seed: number) => {
  const { targets, phrase } = drawTargets(state, shape, deriveSeed(seed, "targets"));
  const tag = drawTag(deriveSeed(seed, "tag"));

  return {
    request: wordUntagRequest(phrase, tag, deriveSeed(seed, "wording")),
    setup: [{ type: "updateSeeders", targets, add: { tags: [tag] } }],
    steps: [{ type: "updateSeeders", targets, remove: { tags: [tag] } }],
  };
};

/** Goals that add or remove a tag on seeders. */
export const TAG_GOALS: Readonly<Record<string, GoalBuilder>> = {
  "tag-seeder": buildTagGoal("seeder"),
  "tag-seeders": buildTagGoal("seeders"),
  "tag-category": buildTagGoal("category"),
  "tag-category-except": buildTagGoal("categoryExcept"),
  "tag-categories": buildTagGoal("categories"),
  "untag-seeder": buildUntagGoal("seeder"),
  "untag-category": buildUntagGoal("category"),
};
