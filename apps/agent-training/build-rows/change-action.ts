import type { Command } from "@poe/panel-state/execute-command";
import type { PanelState, SeederPatch, SeederRemoval } from "@poe/panel-state/types";
import { deriveSeed } from "../build-goals/derive-seed.ts";
import { pickOne } from "../build-goals/pick.ts";
import { pickOtherCategory } from "./pick-other.ts";

/** Turns a removal into the same values added, or undefined when it drops whole conditions, which have no values to add. */
function invertRemoval(remove: SeederRemoval): SeederPatch | undefined {
  if (Object.keys(remove.conditions ?? {}).length > 0) return undefined;
  return { ...(remove.tags === undefined
    ? {}
    : { tags: remove.tags }), ...(remove.knownItems === undefined
    ? {}
    : { knownItems: remove.knownItems }) };
}

/** Swaps add for remove, or remove for add, on the same targets and values. */
function invertUpdate(command: Extract<Command, { type: "updateSeeders" }>): Command | undefined {
  if (command.add !== undefined) return { type: "updateSeeders", targets: command.targets, remove: command.add };
  const add = command.remove === undefined
    ? undefined
    : invertRemoval(command.remove);
  return add === undefined
    ? undefined
    : { type: "updateSeeders", targets: command.targets, add };
}

/**
 * Returns a command doing the wrong thing to the right target: remove instead of add, delete
 * instead of move or rename, merge instead of delete, and so on.
 *
 * @example
 * changeAction({ type: "moveSeeders", targets: { seeders: ["Amulets"] }, toCategory: "Jewels" }, state, 7);
 * // → { type: "deleteSeeders", targets: { seeders: ["Amulets"] } }
 */
export function changeAction(command: Command, state: PanelState, seed: number): Command | undefined {
  const pick = deriveSeed(seed, "action");

  if (command.type === "updateSeeders") return invertUpdate(command);
  if (command.type === "moveSeeders") return { type: "deleteSeeders", targets: command.targets };
  if (command.type === "deleteSeeders") return { type: "moveSeeders", targets: command.targets, toCategory: pickOtherCategory(state, [], pick) };
  if (command.type === "createSeeder") return { type: "createCategory", category: command.seeder };
  if (command.type === "createCategory") return { type: "createSeeder", category: pickOne(Object.keys(state.categories), "a category", pick), seeder: command.category };
  if (command.type === "rename" && command.target === "category") return { type: "deleteCategory", category: command.name };
  if (command.type === "rename") return { type: "deleteSeeders", targets: { seeders: [command.name] } };
  if (command.type === "mergeCategory") return { type: "deleteCategory", category: command.category };
  if (command.type === "deleteCategory") return { type: "mergeCategory", category: command.category, into: pickOtherCategory(state, [command.category], pick) };
  if (command.add !== undefined) return { type: "updateItems", items: command.items, remove: command.add };
  return { type: "updateItems", items: command.items, add: command.remove ?? {} };
}
