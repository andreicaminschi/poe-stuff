import type { Command } from "@poe/panel-state/execute-command";
import type { PanelState, Targets } from "@poe/panel-state/types";
import { deriveSeed } from "../build-goals/derive-seed.ts";
import { pickOtherCategories, pickOtherCategory, pickOtherItems, pickOtherSeeders } from "./pick-other.ts";

/** Points bulk targets at other categories or other seeders, dropping exceptions that would no longer fit. */
function retarget(targets: Targets, state: PanelState, seed: number): Targets {
  const categories = targets.categories ?? [];
  const seeders = targets.seeders ?? [];

  if (categories.length > 0) return { categories: pickOtherCategories(state, categories, categories.length, seed) };
  return { seeders: pickOtherSeeders(state, seeders, Math.max(seeders.length, 1), seed) };
}

/**
 * Returns the command aimed at the wrong thing: other seeders or categories, another destination,
 * or other items. Undefined for a command with nothing to aim, such as creating a category.
 *
 * @example
 * changeTarget({ type: "updateSeeders", targets: { categories: ["Bases"], except: ["Amulets"] }, add: { tags: ["chase"] } }, state, 7);
 * // → { type: "updateSeeders", targets: { categories: ["Jewels"] }, add: { tags: ["chase"] } }
 */
export function changeTarget(command: Command, state: PanelState, seed: number): Command | undefined {
  const pick = deriveSeed(seed, "target");

  if (command.type === "updateSeeders" || command.type === "moveSeeders" || command.type === "deleteSeeders") return { ...command, targets: retarget(command.targets, state, pick) };
  if (command.type === "createSeeder") return { ...command, category: pickOtherCategory(state, [command.category], pick) };
  if (command.type === "rename" && command.target === "category") return { ...command, name: pickOtherCategory(state, [command.name], pick) };
  if (command.type === "rename") return { ...command, name: pickOtherSeeders(state, [command.name], 1, pick)[0] ?? command.name };
  if (command.type === "mergeCategory") return { ...command, into: pickOtherCategory(state, [command.category, command.into], pick) };
  if (command.type === "deleteCategory") return { ...command, category: pickOtherCategory(state, [command.category], pick) };
  if (command.type === "updateItems") return { ...command, items: pickOtherItems(state, command.items, command.items.length, pick) };
  return undefined;
}
