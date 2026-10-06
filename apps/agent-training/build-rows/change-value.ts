import type { Command } from "@poe/panel-state/execute-command";
import type { PanelState, SeederPatch } from "@poe/panel-state/types";
import { drawConditionChange } from "../build-goals/conditions.ts";
import { deriveSeed } from "../build-goals/derive-seed.ts";
import { drawNewName, drawTag } from "../build-goals/pick.ts";
import { pickOtherItems } from "./pick-other.ts";

/** Swaps what a patch writes for a different value of the same field: another tag, another item, another condition. */
function revaluePatch(patch: SeederPatch, state: PanelState, seed: number): SeederPatch | undefined {
  if (patch.tags !== undefined) return { tags: [drawTag(seed)] };
  if (patch.knownItems !== undefined) return { knownItems: pickOtherItems(state, patch.knownItems, patch.knownItems.length, seed) };
  if (patch.conditions === undefined) return undefined;
  const change = drawConditionChange(seed);
  return { conditions: { [change.condition]: change.value } };
}

/**
 * Returns the command writing the wrong value: another tag, item, condition or new name, on the
 * same target. Undefined for a command that writes no value, such as a move.
 *
 * @example
 * changeValue({ type: "updateSeeders", targets: { seeders: ["Rings"] }, add: { tags: ["chase"] } }, state, 7);
 * // → { type: "updateSeeders", targets: { seeders: ["Rings"] }, add: { tags: ["velvet"] } }
 */
export function changeValue(command: Command, state: PanelState, seed: number): Command | undefined {
  const pick = deriveSeed(seed, "value");

  if ((command.type === "updateSeeders" || command.type === "createSeeder") && command.add !== undefined) {
    const add = revaluePatch(command.add, state, pick);
    return add === undefined
      ? undefined
      : { ...command, add };
  }
  if (command.type === "updateSeeders" && command.remove?.tags !== undefined) return { ...command, remove: { tags: [drawTag(pick)] } };
  if (command.type === "updateSeeders" && command.remove?.knownItems !== undefined) return { ...command, remove: { knownItems: pickOtherItems(state, command.remove.knownItems, command.remove.knownItems.length, pick) } };
  if (command.type === "rename") return { ...command, to: drawNewName(state, pick) };
  if (command.type === "createCategory") return { ...command, category: drawNewName(state, pick) };
  if (command.type === "createSeeder") return { ...command, seeder: drawNewName(state, pick) };
  if (command.type === "updateItems") return { ...command, ...(command.add === undefined
    ? { remove: { tags: [drawTag(pick)] } }
    : { add: { tags: [drawTag(pick)] } }) };
  return undefined;
}
