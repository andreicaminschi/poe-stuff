import type { GoalBuilder } from "../types.ts";
import { deriveSeed } from "./derive-seed.ts";
import { drawTag, pickSome } from "./pick.ts";
import { formatList, pickWording } from "./word.ts";

/** Builds a goal that tags one to three items. */
const buildTagItemsGoal: GoalBuilder = (state, seed) => {
  const items = pickSome(Object.keys(state.items), 1, 3, deriveSeed(seed, "items"));
  const tag = drawTag(deriveSeed(seed, "tag"));
  const listed = formatList(items);

  return {
    request: pickWording([
      () => `Tag ${listed} as ${tag}`,
      () => `Tag ${listed} with ${tag}`,
      () => `Tag the items ${listed} with ${tag}`,
      () => `Tag ${tag} on ${listed}`,
      () => `Please tag ${listed} as ${tag}`,
      () => `Mark ${listed} as ${tag}`,
      () => `Mark ${listed} ${tag}`,
      () => `Label ${listed} as ${tag}`,
      () => `Flag ${listed} as ${tag}`,
      () => `Give ${listed} the ${tag} tag`,
      () => `Give ${listed} ${tag}`,
      () => `Add the tag ${tag} to the items ${listed}`,
      () => `Add ${tag} to ${listed}`,
      () => `Add the ${tag} tag to ${listed}`,
      () => `Put the ${tag} tag on ${listed}`,
      () => `Put ${tag} on ${listed}`,
      () => `Stick ${tag} on ${listed}`,
      () => `Set the ${tag} tag on ${listed}`,
      () => `Apply ${tag} to ${listed}`,
      () => `Attach ${tag} to ${listed}`,
      () => `Assign ${tag} to ${listed}`,
      () => `${listed} should be tagged ${tag}`,
      () => `Can you tag ${listed} as ${tag}?`,
      () => `I want ${listed} tagged ${tag}`,
      () => `Could ${listed} get the ${tag} tag?`,
      () => `I'd like ${listed} marked ${tag}`,
      () => `${listed} should have the ${tag} tag`,
      () => `Would you mark ${listed} as ${tag}?`,
      () => `Let's tag ${listed} as ${tag}`,
      () => `Can ${listed} be tagged ${tag}?`,
    ], deriveSeed(seed, "wording")),
    setup: [],
    steps: [{ type: "updateItems", items, add: { tags: [tag] } }],
  };
};

/** Builds a goal that removes a tag the setup put on one to three items. */
const buildUntagItemsGoal: GoalBuilder = (state, seed) => {
  const items = pickSome(Object.keys(state.items), 1, 3, deriveSeed(seed, "items"));
  const tag = drawTag(deriveSeed(seed, "tag"));
  const listed = formatList(items);

  return {
    request: pickWording([
      () => `Remove the ${tag} tag from ${listed}`,
      () => `Remove ${tag} from ${listed}`,
      () => `Remove tag ${tag} from the items ${listed}`,
      () => `Please take ${tag} off ${listed}`,
      () => `Untag ${listed}, they're not ${tag}`,
      () => `Untag ${tag} from ${listed}`,
      () => `Drop the ${tag} tag from ${listed}`,
      () => `Drop ${tag} from ${listed}`,
      () => `Take ${tag} off ${listed}`,
      () => `Take the ${tag} tag off ${listed}`,
      () => `Clear ${tag} on ${listed}`,
      () => `Clear the ${tag} tag from ${listed}`,
      () => `Strip ${tag} from ${listed}`,
      () => `Delete the ${tag} tag from ${listed}`,
      () => `Unmark ${listed} as ${tag}`,
      () => `Unflag ${listed} as ${tag}`,
      () => `Get rid of ${tag} on ${listed}`,
      () => `Pull ${tag} off ${listed}`,
      () => `Stop tagging ${listed} as ${tag}`,
      () => `Detach ${tag} from ${listed}`,
      () => `${listed} shouldn't be ${tag} anymore`,
      () => `Can you untag ${tag} from ${listed}?`,
      () => `I want ${tag} gone from ${listed}`,
      () => `${listed} shouldn't have the ${tag} tag`,
      () => `Could you remove ${tag} from ${listed}?`,
      () => `I don't want ${listed} tagged ${tag}`,
      () => `Can the ${tag} tag come off ${listed}?`,
      () => `I'd like ${tag} removed from ${listed}`,
    ], deriveSeed(seed, "wording")),
    setup: [{ type: "updateItems", items, add: { tags: [tag] } }],
    steps: [{ type: "updateItems", items, remove: { tags: [tag] } }],
  };
};

/** Goals that tag or untag items. */
export const ITEM_GOALS: Readonly<Record<string, GoalBuilder>> = {
  "tag-items": buildTagItemsGoal,
  "untag-items": buildUntagItemsGoal,
};
