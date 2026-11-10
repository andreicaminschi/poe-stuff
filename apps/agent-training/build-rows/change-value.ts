import type { Command } from "@poe/panel-state/execute-command";
import type { PanelState, SeederPatch, TagSeederPatch } from "@poe/panel-state/types";
import { drawConditionChange } from "../build-scenarios/conditions.ts";
import { deriveSeed } from "../build-scenarios/derive-seed.ts";
import { drawNewName, drawTag } from "../build-scenarios/pick.ts";
import { pickOtherBaseTypes, pickOtherNames } from "./pick-other.ts";

/** Swaps what a seeder patch writes for a different value of the same field: another known item, another condition. */
function revaluePatch(patch: SeederPatch, state: PanelState, seed: number): SeederPatch | undefined {
  if (patch.names !== undefined) return { names: pickOtherNames(state, patch.names, patch.names.length, seed) };
  if (patch.conditions === undefined) return undefined;
  const change = drawConditionChange(seed);
  return { conditions: { [change.condition]: change.value } };
}

/** Swaps what a tag seeder patch writes: another tag, or other bases. */
function revalueTagSeederPatch(patch: TagSeederPatch, state: PanelState, seed: number): TagSeederPatch | undefined {
  if (patch.tags !== undefined) return { ...patch, tags: [drawTag(seed)] };
  const bases = patch.conditions?.BaseType;
  if (bases === undefined) return undefined;
  return { ...patch, conditions: { ...patch.conditions, BaseType: pickOtherBaseTypes(state, bases, bases.length, seed) } };
}

/**
 * Returns the command writing the wrong value: another tag, known item, condition, base or new
 * name, on the same target. Undefined for a command that writes no value, such as a move.
 *
 * @example
 * changeValue({ type: "updateSeederTags", targets: { seeders: ["Rings"] }, add: ["chase"] }, state, 7);
 * // → { type: "updateSeederTags", targets: { seeders: ["Rings"] }, add: ["velvet"] }
 */
export function changeValue(command: Command, state: PanelState, seed: number): Command | undefined {
  const pick = deriveSeed(seed, "value");

  if ((command.type === "updateSeeders" || command.type === "createSeeder") && command.add !== undefined) {
    const add = revaluePatch(command.add, state, pick);
    return add === undefined
      ? undefined
      : { ...command, add };
  }
  if (command.type === "updateSeeders" && command.remove?.names !== undefined) return { ...command, remove: { names: pickOtherNames(state, command.remove.names, command.remove.names.length, pick) } };
  if (command.type === "updateSeederTags") return { ...command, ...(command.add === undefined
    ? { remove: [drawTag(pick)] }
    : { add: [drawTag(pick)] }) };
  if (command.type === "createTagSeeder") return { ...command, tags: [drawTag(pick)] };
  if (command.type === "updateTagSeeder" && command.add !== undefined) {
    const add = revalueTagSeederPatch(command.add, state, pick);
    return add === undefined
      ? undefined
      : { ...command, add };
  }
  if (command.type === "updateTagSeeder" && command.remove?.tags !== undefined) return { ...command, remove: { tags: [drawTag(pick)] } };
  if (command.type === "rename") return { ...command, to: drawNewName(state, pick) };
  if (command.type === "createCategory") return { ...command, category: drawNewName(state, pick) };
  if (command.type === "createSeeder") return { ...command, seeder: drawNewName(state, pick) };
  return undefined;
}
