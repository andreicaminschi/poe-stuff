import type { CreateTagSeederCommand } from "@poe/panel-state/execute-command";
import type { PanelState } from "@poe/panel-state/types";
import type { ScenarioBuilder } from "../types.ts";
import { deriveSeed } from "./derive-seed.ts";
import { drawNewName, drawTag, listSeeders, pickSome } from "./pick.ts";
import { formatList, pickWording } from "./word.ts";

/** Lists every BaseType any seeder holds, once each. */
const listBaseTypes = (state: PanelState): readonly string[] =>
  [...new Set(listSeeders(state).flatMap((placed) => Object.keys(placed.value.conditions?.BaseType ?? {})))];

/**
 * Names a tag seeder the one way the agent learns: the tag, then the bases.
 *
 * @example
 * nameTagSeeder("chase", ["Chain Gloves", "Riveted Gloves"]); // → "chase: Chain Gloves, Riveted Gloves"
 */
const nameTagSeeder = (tag: string, bases: readonly string[]): string => `${tag}: ${bases.join(", ")}`;

/** Draws one to three bases and a tag, and the command that tags those bases. */
function drawTagSeeder(state: PanelState, seed: number): CreateTagSeederCommand {
  const bases = pickSome(listBaseTypes(state), 1, 3, deriveSeed(seed, "bases"));
  const tag = drawTag(deriveSeed(seed, "tag"));
  return { type: "createTagSeeder", name: nameTagSeeder(tag, bases), conditions: { BaseType: bases }, tags: [tag] };
}

/** Builds a scenario that tags one to three bases, which makes a tag seeder the agent names itself. */
const buildCreateTagSeederScenario: ScenarioBuilder = (state, seed) => {
  const command = drawTagSeeder(state, seed);
  const listed = formatList(command.conditions.BaseType ?? []);
  const tag = command.tags[0] ?? "";

  return {
    request: pickWording([
      () => `Tag ${listed} as ${tag}`,
      () => `Tag ${listed} with ${tag}`,
      () => `Tag every ${listed} as ${tag}`,
      () => `Tag ${tag} on ${listed}`,
      () => `Please tag ${listed} as ${tag}`,
      () => `Mark ${listed} as ${tag}`,
      () => `Label ${listed} as ${tag}`,
      () => `Flag ${listed} as ${tag}`,
      () => `Give ${listed} the ${tag} tag`,
      () => `Add the ${tag} tag to ${listed}`,
      () => `Put the ${tag} tag on ${listed}`,
      () => `Apply ${tag} to ${listed}`,
      () => `${listed} should be tagged ${tag}`,
      () => `Can you tag ${listed} as ${tag}?`,
      () => `I want ${listed} tagged ${tag}`,
      () => `I'd like every ${listed} marked ${tag}`,
      () => `Make a tag seeder that tags ${listed} as ${tag}`,
      () => `New tag seeder: ${listed} get ${tag}`,
    ], deriveSeed(seed, "wording")),
    setup: [],
    steps: [command],
  };
};

/** Builds a scenario that adds a tag to a tag seeder the setup made. */
const buildAddTagSeederTagScenario: ScenarioBuilder = (state, seed) => {
  const created = drawTagSeeder(state, deriveSeed(seed, "setup"));
  const tag = drawTag(deriveSeed(seed, "added"));

  return {
    request: pickWording([
      () => `Add ${tag} to the ${created.name} tag seeder`,
      () => `Add the ${tag} tag to ${created.name}`,
      () => `Tag seeder ${created.name} should also give ${tag}`,
      () => `Make ${created.name} tag ${tag} too`,
      () => `Give the ${created.name} tag seeder the ${tag} tag`,
      () => `Can ${created.name} also tag ${tag}?`,
      () => `I want ${created.name} to add ${tag} as well`,
    ], deriveSeed(seed, "wording")),
    setup: [created],
    steps: [{ type: "updateTagSeeder", name: created.name, add: { tags: [tag] } }],
  };
};

/** Builds a scenario that removes one of two tags from a tag seeder the setup made. */
const buildRemoveTagSeederTagScenario: ScenarioBuilder = (state, seed) => {
  const created = drawTagSeeder(state, deriveSeed(seed, "setup"));
  const tag = drawTag(deriveSeed(seed, "removed"));

  return {
    request: pickWording([
      () => `Remove ${tag} from the ${created.name} tag seeder`,
      () => `Take the ${tag} tag off ${created.name}`,
      () => `${created.name} shouldn't tag ${tag} anymore`,
      () => `Drop ${tag} from ${created.name}`,
      () => `Stop ${created.name} from tagging ${tag}`,
      () => `Can you remove ${tag} from ${created.name}?`,
      () => `I don't want ${created.name} to give ${tag}`,
    ], deriveSeed(seed, "wording")),
    setup: [{ ...created, tags: [...created.tags, tag] }],
    steps: [{ type: "updateTagSeeder", name: created.name, remove: { tags: [tag] } }],
  };
};

/** Builds a scenario that renames a tag seeder the setup made. */
const buildRenameTagSeederScenario: ScenarioBuilder = (state, seed) => {
  const created = drawTagSeeder(state, deriveSeed(seed, "setup"));
  const name = drawNewName(state, deriveSeed(seed, "name"));

  return {
    request: pickWording([
      () => `Rename the ${created.name} tag seeder to ${name}`,
      () => `Rename ${created.name} to ${name}`,
      () => `Call the tag seeder ${created.name} ${name} instead`,
      () => `${created.name} should be called ${name}`,
      () => `Can you rename ${created.name} to ${name}?`,
      () => `I want the ${created.name} tag seeder named ${name}`,
    ], deriveSeed(seed, "wording")),
    setup: [created],
    steps: [{ type: "rename", target: "tagSeeder", name: created.name, to: name }],
  };
};

/** Builds a scenario that deletes a tag seeder the setup made. */
const buildDeleteTagSeederScenario: ScenarioBuilder = (state, seed) => {
  const created = drawTagSeeder(state, deriveSeed(seed, "setup"));

  return {
    request: pickWording([
      () => `Delete the ${created.name} tag seeder`,
      () => `Delete ${created.name}`,
      () => `Remove the tag seeder ${created.name}`,
      () => `Get rid of ${created.name}`,
      () => `We don't need ${created.name} anymore`,
      () => `Can you delete the ${created.name} tag seeder?`,
      () => `I want ${created.name} gone`,
    ], deriveSeed(seed, "wording")),
    setup: [created],
    steps: [{ type: "deleteTagSeeder", name: created.name }],
  };
};

/** Scenarios that make, edit, rename or delete item-kind tag seeders. */
export const ITEM_SCENARIOS: Readonly<Record<string, ScenarioBuilder>> = {
  "create-tag-seeder": buildCreateTagSeederScenario,
  "add-tag-seeder-tag": buildAddTagSeederTagScenario,
  "remove-tag-seeder-tag": buildRemoveTagSeederTagScenario,
  "rename-tag-seeder": buildRenameTagSeederScenario,
  "delete-tag-seeder": buildDeleteTagSeederScenario,
};
