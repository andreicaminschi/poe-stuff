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
      () => `${shown} should know ${item}`,
      () => `Put ${item} under ${shown}`,
      () => `${item} belongs to ${shown}`,
      () => `${shown}: add known item ${item}`,
      () => `List ${item} under ${shown}`,
      () => `Can you add ${item} to ${shown}?`,
      () => `Register ${item} as a known item of ${shown}`,
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
      () => `${shown} shouldn't list ${listed}`,
      () => `Take ${listed} out of the known items of ${shown}`,
      () => `Drop ${listed} from the known items of ${shown}`,
      () => `${shown}: remove known items ${listed}`,
      () => `${listed} shouldn't be under ${shown}`,
      () => `Can you remove ${listed} from ${shown}?`,
      () => `Unlist ${listed} from ${shown}`,
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
