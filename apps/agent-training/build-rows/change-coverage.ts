import type { Command } from "@poe/panel-state/execute-command";
import type { PanelState, Targets } from "@poe/panel-state/types";
import { deriveSeed } from "../build-scenarios/derive-seed.ts";
import { listSeedersIn, pickOne } from "../build-scenarios/pick.ts";
import { pickOtherBaseTypes, pickSiblingSeeder } from "./pick-other.ts";

/**
 * Widens or narrows bulk targets: drops the exceptions, adds one where there was none, drops a
 * named seeder, or adds a sibling to a lone one. Undefined when no change fits.
 */
function recover(targets: Targets, state: PanelState, seed: number): Targets | undefined {
  const categories = targets.categories ?? [];
  const seeders = targets.seeders ?? [];
  const first = categories[0];

  if ((targets.except ?? []).length > 0) return { ...targets, except: [] };
  if (first !== undefined && listSeedersIn(state, first).length >= 2) return { ...targets, except: [pickOne(listSeedersIn(state, first), "a seeder to leave out", seed)] };
  if (seeders.length >= 2) return { ...targets, seeders: seeders.slice(0, -1) };
  const lone = seeders[0];
  const sibling = lone === undefined
    ? undefined
    : pickSiblingSeeder(state, lone, seed);
  return sibling === undefined
    ? undefined
    : { ...targets, seeders: [...seeders, sibling] };
}

/** Drops the last base, or adds one when there is only one. */
const recoverBases = (bases: readonly string[], state: PanelState, seed: number): readonly string[] =>
  (bases.length >= 2
    ? bases.slice(0, -1)
    : [...bases, ...pickOtherBaseTypes(state, bases, 1, seed)]);

/**
 * Returns the command reaching too much or too little: an exception dropped or added, a named
 * target dropped or one too many, a base too few or too many. Undefined for a command without a
 * target list.
 *
 * @example
 * changeCoverage({ type: "updateSeederTags", targets: { categories: ["Bases"], except: ["Amulets"] }, add: ["chase"] }, state, 7);
 * // → { type: "updateSeederTags", targets: { categories: ["Bases"], except: [] }, add: ["chase"] }
 */
export function changeCoverage(command: Command, state: PanelState, seed: number): Command | undefined {
  const pick = deriveSeed(seed, "coverage");

  if (command.type === "updateSeeders" || command.type === "updateSeederTags" || command.type === "moveSeeders" || command.type === "deleteSeeders") {
    const targets = recover(command.targets, state, pick);
    return targets === undefined
      ? undefined
      : { ...command, targets };
  }
  if (command.type === "createTagSeeder" && command.conditions.BaseType !== undefined) {
    return { ...command, conditions: { ...command.conditions, BaseType: recoverBases(command.conditions.BaseType, state, pick) } };
  }
  return undefined;
}
