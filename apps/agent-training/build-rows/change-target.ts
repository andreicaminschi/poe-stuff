import type { Command } from "@poe/panel-state/execute-command";
import type { PanelState, Targets } from "@poe/panel-state/types";
import { deriveSeed } from "../build-scenarios/derive-seed.ts";
import { pickOtherBaseTypes, pickOtherCategories, pickOtherCategory, pickOtherSeeders, pickOtherTagSeeder } from "./pick-other.ts";

/** Points bulk targets at other categories or other seeders, dropping exceptions that would no longer fit. */
function retarget(targets: Targets, state: PanelState, seed: number): Targets {
  const categories = targets.categories ?? [];
  const seeders = targets.seeders ?? [];

  if (categories.length > 0) return { categories: pickOtherCategories(state, categories, categories.length, seed) };
  return { seeders: pickOtherSeeders(state, seeders, Math.max(seeders.length, 1), seed) };
}

/** Points a command that names a tag seeder at another one, or undefined when there is no other. */
function retargetTagSeeder<T extends { readonly name: string }>(command: T, state: PanelState, seed: number): T | undefined {
  const other = pickOtherTagSeeder(state, command.name, seed);
  return other === undefined
    ? undefined
    : { ...command, name: other };
}

/**
 * Returns the command aimed at the wrong thing: other seeders or categories, another destination,
 * other bases, or another tag seeder. Undefined for a command with nothing to aim, such as
 * creating a category.
 *
 * @example
 * changeTarget({ type: "updateSeederTags", targets: { categories: ["Bases"], except: ["Amulets"] }, add: ["chase"] }, state, 7);
 * // → { type: "updateSeederTags", targets: { categories: ["Jewels"] }, add: ["chase"] }
 */
export function changeTarget(command: Command, state: PanelState, seed: number): Command | undefined {
  const pick = deriveSeed(seed, "target");

  if (command.type === "updateSeeders" || command.type === "updateSeederTags" || command.type === "moveSeeders" || command.type === "deleteSeeders") {
    return { ...command, targets: retarget(command.targets, state, pick) };
  }
  if (command.type === "createSeeder") return { ...command, category: pickOtherCategory(state, [command.category], pick) };
  if (command.type === "rename" && command.target === "category") return { ...command, name: pickOtherCategory(state, [command.name], pick) };
  if (command.type === "rename" && command.target === "tagSeeder") return retargetTagSeeder(command, state, pick);
  if (command.type === "rename") return { ...command, name: pickOtherSeeders(state, [command.name], 1, pick)[0] ?? command.name };
  if (command.type === "deleteCategory") return { ...command, category: pickOtherCategory(state, [command.category], pick) };
  if (command.type === "createTagSeeder" && command.conditions.BaseType !== undefined) {
    const bases = command.conditions.BaseType;
    return { ...command, conditions: { ...command.conditions, BaseType: pickOtherBaseTypes(state, bases, bases.length, pick) } };
  }
  if (command.type === "updateTagSeeder" || command.type === "deleteTagSeeder") return retargetTagSeeder(command, state, pick);
  return undefined;
}
