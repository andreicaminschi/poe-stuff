import type { Command } from "@poe/panel-state/execute-command";
import type { PanelState, Targets } from "@poe/panel-state/types";
import { deriveSeed } from "../build-goals/derive-seed.ts";
import { listSeedersIn, pickOne } from "../build-goals/pick.ts";
import { pickOtherItems, pickSiblingSeeder } from "./pick-other.ts";

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

/**
 * Returns the command reaching too much or too little: an exception dropped or added, a named
 * target dropped or one too many. Undefined for a command without a target list.
 *
 * @example
 * changeCoverage({ type: "updateSeeders", targets: { categories: ["Bases"], except: ["Amulets"] }, add: { tags: ["chase"] } }, state, 7);
 * // → { type: "updateSeeders", targets: { categories: ["Bases"], except: [] }, add: { tags: ["chase"] } }
 */
export function changeCoverage(command: Command, state: PanelState, seed: number): Command | undefined {
  const pick = deriveSeed(seed, "coverage");

  if (command.type === "updateSeeders" || command.type === "moveSeeders" || command.type === "deleteSeeders") {
    const targets = recover(command.targets, state, pick);
    return targets === undefined
      ? undefined
      : { ...command, targets };
  }
  if (command.type === "updateItems" && command.items.length >= 2) return { ...command, items: command.items.slice(0, -1) };
  if (command.type === "updateItems") return { ...command, items: [...command.items, ...pickOtherItems(state, command.items, 1, pick)] };
  return undefined;
}
