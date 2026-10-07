import type { PanelState } from "@poe/panel-state/types";
import type { GoalBuilder } from "../types.ts";
import { deriveSeed } from "./derive-seed.ts";
import { drawTag } from "./pick.ts";
import { drawTargets, type TargetShape } from "./targets.ts";
import { pickWording } from "./word.ts";

/** Words a request to add a tag. */
const wordTagRequest = (phrase: string, tag: string, seed: number): string => pickWording([
  () => `Tag ${phrase} as ${tag}`,
  () => `Tag ${phrase} with ${tag}`,
  () => `Tag ${phrase} ${tag}`,
  () => `Tag ${phrase} with the ${tag} tag`,
  () => `Tag ${tag} on ${phrase}`,
  () => `Please tag ${phrase} as ${tag}`,
  () => `Mark ${phrase} as ${tag}`,
  () => `Mark ${phrase} ${tag}`,
  () => `Mark ${phrase} with ${tag}`,
  () => `Label ${phrase} ${tag}`,
  () => `Label ${phrase} as ${tag}`,
  () => `Flag ${phrase} as ${tag}`,
  () => `Flag ${phrase} ${tag}`,
  () => `Add the ${tag} tag to ${phrase}`,
  () => `Add ${tag} to ${phrase}`,
  () => `Add tag ${tag} to ${phrase}`,
  () => `Put the tag "${tag}" on ${phrase}`,
  () => `Put ${tag} on ${phrase}`,
  () => `Put the ${tag} tag on ${phrase}`,
  () => `Stick ${tag} on ${phrase}`,
  () => `Slap ${tag} on ${phrase}`,
  () => `Throw the ${tag} tag on ${phrase}`,
  () => `Give ${phrase} the ${tag} tag`,
  () => `Give ${phrase} ${tag}`,
  () => `Give ${phrase} tag ${tag}`,
  () => `Set the ${tag} tag on ${phrase}`,
  () => `Apply ${tag} to ${phrase}`,
  () => `Apply the ${tag} tag to ${phrase}`,
  () => `Attach ${tag} to ${phrase}`,
  () => `Assign ${tag} to ${phrase}`,
  () => `Assign the ${tag} tag to ${phrase}`,
  () => `Make ${phrase} ${tag}`,
  () => `${phrase} should be tagged ${tag}`,
  () => `Can you tag ${phrase} as ${tag}?`,
  () => `I want ${phrase} tagged ${tag}`,
  () => `Could ${phrase} get the ${tag} tag?`,
  () => `Could you mark ${phrase} as ${tag}?`,
  () => `I'd like ${phrase} tagged ${tag}`,
  () => `${phrase} needs the ${tag} tag`,
  () => `${phrase} should have the ${tag} tag`,
  () => `Can ${phrase} get ${tag}?`,
  () => `Would you tag ${phrase} as ${tag}?`,
  () => `I need ${phrase} marked as ${tag}`,
  () => `Let's tag ${phrase} as ${tag}`,
], seed);

/** Words a request to remove a tag. */
const wordUntagRequest = (phrase: string, tag: string, seed: number): string => pickWording([
  () => `Remove the ${tag} tag from ${phrase}`,
  () => `Remove ${tag} from ${phrase}`,
  () => `Remove tag ${tag} from ${phrase}`,
  () => `Please remove the ${tag} tag from ${phrase}`,
  () => `Untag ${tag} on ${phrase}`,
  () => `Untag ${tag} from ${phrase}`,
  () => `Drop tag ${tag} from ${phrase}`,
  () => `Drop the ${tag} tag from ${phrase}`,
  () => `Drop ${tag} from ${phrase}`,
  () => `Take the ${tag} tag off ${phrase}`,
  () => `Take ${tag} off ${phrase}`,
  () => `Clear the ${tag} tag on ${phrase}`,
  () => `Clear ${tag} from ${phrase}`,
  () => `Strip ${tag} from ${phrase}`,
  () => `Strip the ${tag} tag off ${phrase}`,
  () => `Delete the ${tag} tag from ${phrase}`,
  () => `Delete tag ${tag} on ${phrase}`,
  () => `Unmark ${phrase} as ${tag}`,
  () => `Unmark ${tag} on ${phrase}`,
  () => `Unflag ${phrase} as ${tag}`,
  () => `Get rid of the ${tag} tag on ${phrase}`,
  () => `Pull ${tag} off ${phrase}`,
  () => `Stop tagging ${phrase} as ${tag}`,
  () => `Stop marking ${phrase} as ${tag}`,
  () => `Detach ${tag} from ${phrase}`,
  () => `Unassign ${tag} from ${phrase}`,
  () => `${phrase} shouldn't be tagged ${tag} anymore`,
  () => `${phrase} doesn't need the ${tag} tag anymore`,
  () => `Can you remove the ${tag} tag from ${phrase}?`,
  () => `I want ${tag} gone from ${phrase}`,
  () => `Could you untag ${tag} on ${phrase}?`,
  () => `${phrase} is no longer ${tag}`,
  () => `I don't want ${phrase} tagged ${tag}`,
  () => `Can ${tag} come off ${phrase}?`,
  () => `I'd like the ${tag} tag off ${phrase}`,
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
