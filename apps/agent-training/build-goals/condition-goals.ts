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
      () => `Please set ${change.phrase} on ${phrase}`,
      () => `Add the condition ${change.phrase} to ${phrase}`,
      () => `Add ${change.phrase} to ${phrase}`,
      () => `Add a ${change.phrase} condition to ${phrase}`,
      () => `Put ${change.phrase} on ${phrase}`,
      () => `Give ${phrase} the condition ${change.phrase}`,
      () => `Give ${phrase} ${change.phrase}`,
      () => `Make ${phrase} ${change.phrase} only`,
      () => `Make ${phrase} require ${change.phrase}`,
      () => `Restrict ${phrase} to ${change.phrase}`,
      () => `Limit ${phrase} to ${change.phrase}`,
      () => `Filter ${phrase} by ${change.phrase}`,
      () => `Filter ${phrase} to ${change.phrase}`,
      () => `Only show ${change.phrase} items for ${phrase}`,
      () => `Only show ${change.phrase} for ${phrase}`,
      () => `Only match ${change.phrase} on ${phrase}`,
      () => `Apply ${change.phrase} to ${phrase}`,
      () => `Require ${change.phrase} on ${phrase}`,
      () => `Require ${change.phrase} for ${phrase}`,
      () => `Narrow ${phrase} to ${change.phrase}`,
      () => `Lock ${phrase} to ${change.phrase}`,
      () => `Constrain ${phrase} to ${change.phrase}`,
      () => `Use ${change.phrase} for ${phrase}`,
      () => `${phrase} should require ${change.phrase}`,
      () => `Can you make ${phrase} require ${change.phrase}?`,
      () => `${phrase} should only take ${change.phrase}`,
      () => `I want ${phrase} limited to ${change.phrase}`,
      () => `Could you restrict ${phrase} to ${change.phrase}?`,
      () => `${phrase} needs ${change.phrase}`,
      () => `I'd like ${phrase} to require ${change.phrase}`,
      () => `Can ${phrase} be ${change.phrase} only?`,
      () => `${phrase} should only match ${change.phrase} items`,
      () => `Would you set ${change.phrase} on ${phrase}?`,
      () => `I only want ${change.phrase} on ${phrase}`,
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
      () => `Add ${rarity.toLowerCase()} rarity to ${shown}`,
      () => `Add ${rarity} to ${shown}'s rarity`,
      () => `Please add ${rarity.toLowerCase()} to ${shown}'s rarity`,
      () => `Include ${rarity.toLowerCase()} in the rarity of ${shown}`,
      () => `Include ${rarity.toLowerCase()} items in ${shown}`,
      () => `Allow ${rarity.toLowerCase()} for ${shown}`,
      () => `Allow ${rarity.toLowerCase()} items on ${shown}`,
      () => `Also allow ${rarity.toLowerCase()} on ${shown}`,
      () => `Also include ${rarity} in ${shown}`,
      () => `Let ${shown} include ${rarity.toLowerCase()} rarity too`,
      () => `Let ${shown} take ${rarity.toLowerCase()} items too`,
      () => `Extend the rarity on ${shown} with ${rarity}`,
      () => `Extend ${shown} to ${rarity.toLowerCase()} items too`,
      () => `Widen ${shown}'s rarity to include ${rarity.toLowerCase()}`,
      () => `Open ${shown} up to ${rarity.toLowerCase()} items`,
      () => `${shown} should also allow ${rarity.toLowerCase()} items`,
      () => `Can ${shown} take ${rarity.toLowerCase()} items too?`,
      () => `${shown} should include ${rarity.toLowerCase()} too`,
      () => `I want ${shown} to accept ${rarity.toLowerCase()} as well`,
      () => `Could you add ${rarity} to the rarity of ${shown}?`,
      () => `${rarity} items should count for ${shown} too`,
      () => `Can you let ${shown} match ${rarity.toLowerCase()} too?`,
      () => `I'd like ${shown} to allow ${rarity.toLowerCase()} items as well`,
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
      () => `Remove ${word} from ${shown}`,
      () => `Remove any ${word} condition from ${shown}`,
      () => `Please drop ${word} from ${shown}`,
      () => `Drop ${word} from ${shown}`,
      () => `Drop the ${word} condition on ${shown}`,
      () => `Clear the ${word} condition on ${shown}`,
      () => `Clear ${word} on ${shown}`,
      () => `Get rid of the ${word} rule on ${shown}`,
      () => `Get rid of ${word} on ${shown}`,
      () => `Delete the ${word} condition from ${shown}`,
      () => `Strip ${word} from ${shown}`,
      () => `Stop filtering ${shown} by ${word}`,
      () => `Stop checking ${word} on ${shown}`,
      () => `Ignore ${word} on ${shown}`,
      () => `Take the ${word} condition off ${shown}`,
      () => `Lift the ${word} restriction on ${shown}`,
      () => `Unset ${word} on ${shown}`,
      () => `${shown} shouldn't care about ${word}`,
      () => `Can you remove ${word} from ${shown}?`,
      () => `${shown} doesn't need a ${word} condition`,
      () => `I don't want ${shown} filtered by ${word}`,
      () => `Could you clear ${word} on ${shown}?`,
      () => `${word} shouldn't matter for ${shown}`,
      () => `${shown} should ignore ${word}`,
      () => `I want the ${word} condition gone from ${shown}`,
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
      () => `Change ${shown}'s rarity to ${name}`,
      () => `Change ${shown} to ${name}`,
      () => `Please change the rarity of ${shown} to ${name}`,
      () => `Make ${shown} ${name} instead`,
      () => `Switch ${shown} to ${name}`,
      () => `Switch the rarity of ${shown} to ${name}`,
      () => `Set the rarity of ${shown} to ${name}, replacing what's there`,
      () => `Replace the rarity on ${shown} with ${name}`,
      () => `Replace ${shown}'s rarity with ${name}`,
      () => `Swap the rarity on ${shown} for ${name}`,
      () => `Overwrite the rarity of ${shown} with ${name}`,
      () => `Reset the rarity on ${shown} to ${name}`,
      () => `Use rarity ${name} on ${shown} instead`,
      () => `${shown} should be ${name} only, replacing its current rarity`,
      () => `Can you change ${shown} to ${name}?`,
      () => `${shown}'s rarity should be ${name} instead`,
      () => `I want ${shown}'s rarity changed to ${name}`,
      () => `Could you switch ${shown} to ${name}?`,
      () => `${shown} should be ${name} instead`,
      () => `I'd like ${shown}'s rarity switched to ${name}`,
      () => `Can ${shown}'s rarity be ${name} instead?`,
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
