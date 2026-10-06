import type { PanelState } from "@poe/panel-state/types";
import { VALUE_SETS } from "@poe/panel-state/value-sets";
import type { GoalBuilder } from "../types.ts";
import { describeCondition, drawConditionChange } from "./conditions.ts";
import { deriveSeed } from "./derive-seed.ts";
import { pickOne, pickSeeder } from "./pick.ts";
import { drawTargets, type TargetShape } from "./targets.ts";
import { pickWording, varyName } from "./word.ts";

const RARITIES = ["Normal", "Magic", "Rare", "Unique"];

/** Builds a goal that sets one condition on seeders in one target shape. */
const buildConditionGoal = (shape: TargetShape): GoalBuilder => (state: PanelState, seed: number) => {
  const { targets, phrase } = drawTargets(state, shape, deriveSeed(seed, "targets"));
  const change = drawConditionChange(deriveSeed(seed, "change"));

  return {
    request: pickWording([
      () => `Set ${change.phrase} on ${phrase}`,
      () => `${phrase} should require ${change.phrase}`,
      () => `Only show ${change.phrase} items for ${phrase}`,
      () => `Add the condition ${change.phrase} to ${phrase}`,
      () => `Make ${phrase} ${change.phrase} only`,
      () => `Restrict ${phrase} to ${change.phrase}`,
      () => `${phrase}: ${change.phrase}`,
      () => `Can you make ${phrase} require ${change.phrase}?`,
    ], deriveSeed(seed, "wording")),
    setup: [],
    steps: [{ type: "updateSeeders", targets, add: { conditions: { [change.condition]: change.value } } }],
  };
};

/** Builds a goal that adds one rarity to a seeder that already filters on rarity. */
const buildAddRarityGoal: GoalBuilder = (state, seed) => {
  const placed = pickSeeder(state, deriveSeed(seed, "seeder"), (seeder) => seeder.value.conditions?.Rarity !== undefined && Object.keys(seeder.value.conditions.Rarity).length < RARITIES.length);
  const missing = RARITIES.filter((rarity) => placed.value.conditions?.Rarity?.[rarity] === undefined);
  const rarity = pickOne(missing, "a missing rarity", deriveSeed(seed, "rarity"));
  const shown = varyName(placed.seeder, deriveSeed(seed, "shown"));

  return {
    request: pickWording([
      () => `Add ${rarity} to the rarity of ${shown}`,
      () => `${shown} should also allow ${rarity.toLowerCase()} items`,
      () => `Let ${shown} include ${rarity.toLowerCase()} rarity too`,
      () => `Include ${rarity.toLowerCase()} in the rarity of ${shown}`,
      () => `${shown}: also ${rarity.toLowerCase()}`,
      () => `Can ${shown} take ${rarity.toLowerCase()} items too?`,
      () => `Allow ${rarity.toLowerCase()} for ${shown}`,
      () => `Extend the rarity on ${shown} with ${rarity}`,
    ], deriveSeed(seed, "wording")),
    setup: [],
    steps: [{ type: "updateSeeders", targets: { seeders: [placed.seeder] }, add: { conditions: { Rarity: [rarity] } } }],
  };
};

/** Builds a goal that drops one whole condition, other than the base types, from a seeder. */
const buildDropConditionGoal: GoalBuilder = (state, seed) => {
  const placed = pickSeeder(state, deriveSeed(seed, "seeder"), (seeder) => Object.keys(seeder.value.conditions ?? {}).some((name) => name !== "BaseType"));
  const condition = pickOne(Object.keys(placed.value.conditions ?? {}).filter((name) => name !== "BaseType"), "a condition", deriveSeed(seed, "condition"));
  const shown = varyName(placed.seeder, deriveSeed(seed, "shown"));
  const word = describeCondition(condition);

  return {
    request: pickWording([
      () => `Remove the ${word} condition from ${shown}`,
      () => `${shown} shouldn't care about ${word}`,
      () => `Drop ${word} from ${shown}`,
      () => `Clear the ${word} condition on ${shown}`,
      () => `${shown}: no ${word} condition`,
      () => `Get rid of the ${word} rule on ${shown}`,
      () => `Can you remove ${word} from ${shown}?`,
      () => `Stop filtering ${shown} by ${word}`,
    ], deriveSeed(seed, "wording")),
    setup: [],
    steps: [{ type: "updateSeeders", targets: { seeders: [placed.seeder] }, remove: { conditions: { [condition]: null } } }],
  };
};

/** Builds a goal that replaces a seeder's rarity with a named set. */
const buildReplaceRarityGoal: GoalBuilder = (state, seed) => {
  const placed = pickSeeder(state, deriveSeed(seed, "seeder"), (seeder) => seeder.value.conditions?.Rarity !== undefined);
  const name = pickOne(Object.keys(VALUE_SETS.Rarity ?? {}), "a rarity set", deriveSeed(seed, "set"));
  const shown = varyName(placed.seeder, deriveSeed(seed, "shown"));

  return {
    request: pickWording([
      () => `Change the rarity of ${shown} to ${name}`,
      () => `Make ${shown} ${name} instead`,
      () => `${shown} should be ${name} only, replacing its current rarity`,
      () => `Switch ${shown} to ${name}`,
      () => `Set the rarity of ${shown} to ${name}, replacing what's there`,
      () => `${shown}: rarity ${name} instead`,
      () => `Replace the rarity on ${shown} with ${name}`,
      () => `Can you change ${shown} to ${name}?`,
    ], deriveSeed(seed, "wording")),
    setup: [],
    steps: [{ type: "updateSeeders", targets: { seeders: [placed.seeder] }, remove: { conditions: { Rarity: null } }, add: { conditions: { Rarity: name } } }],
  };
};

/** Goals that add, drop or replace conditions on seeders. */
export const CONDITION_GOALS: Readonly<Record<string, GoalBuilder>> = {
  "condition-seeder": buildConditionGoal("seeder"),
  "condition-seeders": buildConditionGoal("seeders"),
  "condition-category": buildConditionGoal("category"),
  "condition-category-except": buildConditionGoal("categoryExcept"),
  "add-rarity": buildAddRarityGoal,
  "drop-condition": buildDropConditionGoal,
  "replace-rarity": buildReplaceRarityGoal,
};
