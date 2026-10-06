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
      () => `Mark ${listed} as ${tag}`,
      () => `Give ${listed} the ${tag} tag`,
      () => `${listed} should be tagged ${tag}`,
      () => `Add the tag ${tag} to the items ${listed}`,
      () => `Can you tag ${listed} as ${tag}?`,
      () => `Items ${listed}: tag ${tag}`,
      () => `Put the ${tag} tag on ${listed}`,
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
      () => `Untag ${listed}, they're not ${tag}`,
      () => `${listed} shouldn't be ${tag} anymore`,
      () => `Drop the ${tag} tag from ${listed}`,
      () => `Take ${tag} off ${listed}`,
      () => `Can you untag ${tag} from ${listed}?`,
      () => `Items ${listed}: remove tag ${tag}`,
      () => `Clear ${tag} on ${listed}`,
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
