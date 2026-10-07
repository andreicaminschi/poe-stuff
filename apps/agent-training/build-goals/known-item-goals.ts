import type { GoalBuilder } from "../types.ts";
import { deriveSeed } from "./derive-seed.ts";
import { pickOne, pickSeeder, pickSome } from "./pick.ts";
import { formatList, pickWording, varyName } from "./word.ts";

/** Builds a goal that adds a real item name, from anywhere in the data, to any seeder that does not list it yet. */
const buildAddKnownItemGoal: GoalBuilder = (state, seed) => {
  const placed = pickSeeder(state, deriveSeed(seed, "seeder"));
  const item = pickOne(Object.keys(state.items).filter((name) => placed.value.knownItems?.[name] === undefined), "an item the seeder lacks", deriveSeed(seed, "item"));
  const shown = varyName(placed.seeder, deriveSeed(seed, "shown"));

  return {
    request: pickWording([
      () => `Add ${item} to the known items of ${shown}`,
      () => `Add ${item} to ${shown}`,
      () => `Add ${item} to ${shown}'s known items`,
      () => `Add ${item} as a known item to ${shown}`,
      () => `Please add ${item} to ${shown}`,
      () => `Give ${shown} the known item ${item}`,
      () => `Put ${item} under ${shown}`,
      () => `Put ${item} in ${shown}`,
      () => `List ${item} under ${shown}`,
      () => `List ${item} in ${shown}`,
      () => `Register ${item} as a known item of ${shown}`,
      () => `Register ${item} under ${shown}`,
      () => `Include ${item} in ${shown}`,
      () => `Attach ${item} to ${shown}`,
      () => `Assign ${item} to ${shown}`,
      () => `Link ${item} to ${shown}`,
      () => `File ${item} under ${shown}`,
      () => `Make ${item} a known item of ${shown}`,
      () => `Throw ${item} into ${shown}`,
      () => `${shown} should know ${item}`,
      () => `${item} belongs to ${shown}`,
      () => `Can you add ${item} to ${shown}?`,
      () => `${item} belongs under ${shown}`,
      () => `${shown} should list ${item}`,
      () => `${item} should be a known item of ${shown}`,
      () => `Could you put ${item} under ${shown}?`,
      () => `I want ${item} listed under ${shown}`,
      () => `I'd like ${shown} to know ${item}`,
      () => `${item} is part of ${shown}`,
    ], deriveSeed(seed, "wording")),
    setup: [],
    steps: [{ type: "updateSeeders", targets: { seeders: [placed.seeder] }, add: { knownItems: [item] } }],
  };
};

/** Builds a goal that removes one or two known items, which the setup first puts on any seeder. */
const buildRemoveKnownItemsGoal: GoalBuilder = (state, seed) => {
  const placed = pickSeeder(state, deriveSeed(seed, "seeder"));
  const items = pickSome(Object.keys(state.items).filter((name) => placed.value.knownItems?.[name] === undefined), 1, 2, deriveSeed(seed, "items"));
  const shown = varyName(placed.seeder, deriveSeed(seed, "shown"));
  const listed = formatList(items);

  return {
    request: pickWording([
      () => `Remove ${listed} from ${shown}`,
      () => `Remove ${listed} from the known items of ${shown}`,
      () => `Remove ${listed} from ${shown}'s known items`,
      () => `Remove the known items ${listed} from ${shown}`,
      () => `Please remove ${listed} from ${shown}`,
      () => `Take ${listed} out of the known items of ${shown}`,
      () => `Take ${listed} out of ${shown}`,
      () => `Take ${listed} off ${shown}`,
      () => `Drop ${listed} from the known items of ${shown}`,
      () => `Drop ${listed} from ${shown}`,
      () => `Unlist ${listed} from ${shown}`,
      () => `Delete ${listed} from ${shown}'s known items`,
      () => `Strip ${listed} from ${shown}`,
      () => `Pull ${listed} out of ${shown}`,
      () => `Clear ${listed} from ${shown}`,
      () => `Detach ${listed} from ${shown}`,
      () => `Unlink ${listed} from ${shown}`,
      () => `Get rid of ${listed} in ${shown}`,
      () => `Make ${shown} forget ${listed}`,
      () => `${shown} shouldn't list ${listed}`,
      () => `${listed} shouldn't be under ${shown}`,
      () => `Can you remove ${listed} from ${shown}?`,
      () => `${listed} shouldn't belong to ${shown}`,
      () => `${shown} shouldn't know ${listed}`,
      () => `Could you take ${listed} out of ${shown}?`,
      () => `I want ${listed} gone from ${shown}`,
      () => `I don't want ${listed} under ${shown}`,
      () => `Can ${listed} come off ${shown}?`,
    ], deriveSeed(seed, "wording")),
    setup: [{ type: "updateSeeders", targets: { seeders: [placed.seeder] }, add: { knownItems: items } }],
    steps: [{ type: "updateSeeders", targets: { seeders: [placed.seeder] }, remove: { knownItems: items } }],
  };
};

/** Goals that add or remove a seeder's known items. Any seeder may hold known items. */
export const KNOWN_ITEM_GOALS: Readonly<Record<string, GoalBuilder>> = {
  "add-known-item": buildAddKnownItemGoal,
  "remove-known-items": buildRemoveKnownItemsGoal,
};
