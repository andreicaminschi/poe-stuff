import type { Command, UpdateTagSeederCommand } from "@poe/panel-state/execute-command";
import type { PanelState, SeederPatch, SeederRemoval, TagSeederPatch, TagSeederRemoval } from "@poe/panel-state/types";
import { deriveSeed } from "../build-scenarios/derive-seed.ts";
import { drawNewName, pickOne } from "../build-scenarios/pick.ts";
import { pickOtherCategory } from "./pick-other.ts";

/** Turns a removal into the same names added, or undefined when it drops conditions, which have no values to add. */
function invertRemoval(remove: SeederRemoval): SeederPatch | undefined {
  if (Object.keys(remove.conditions ?? {}).length > 0 || remove.names === undefined) return undefined;
  return { names: remove.names };
}

/** Turns what a patch adds into the removal of those same names and values. */
const invertPatch = (add: SeederPatch): SeederRemoval => ({
  ...(add.names === undefined
    ? {}
    : { names: add.names }),
  ...(add.conditions === undefined
    ? {}
    : { conditions: Object.fromEntries(Object.entries(add.conditions).map(([condition, values]) => [condition, Object.keys(values)])) }),
});

/** Swaps add for remove, or remove for add, on the same targets and values. */
function invertUpdate(command: Extract<Command, { type: "updateSeeders" }>): Command | undefined {
  if (command.add !== undefined) return { type: "updateSeeders", targets: command.targets, remove: invertPatch(command.add) };
  const add = command.remove === undefined
    ? undefined
    : invertRemoval(command.remove);
  return add === undefined
    ? undefined
    : { type: "updateSeeders", targets: command.targets, add };
}

/** Swaps a tag seeder edit's add for remove, or remove for add. A removal that drops a whole condition has nothing to add. */
function invertTagSeederUpdate(command: UpdateTagSeederCommand): Command | undefined {
  if (command.add !== undefined) return { type: "updateTagSeeder", name: command.name, remove: command.add satisfies TagSeederRemoval };
  const conditions = Object.entries(command.remove?.conditions ?? {});
  if (conditions.some(([, values]) => values === null)) return undefined;
  const add: TagSeederPatch = {
    ...(conditions.length === 0
      ? {}
      : { conditions: Object.fromEntries(conditions.map(([condition, values]) => [condition, values ?? []])) }),
    ...(command.remove?.tags === undefined
      ? {}
      : { tags: command.remove.tags }),
  };
  return { type: "updateTagSeeder", name: command.name, add };
}

/** Swaps a seeder tag edit's add for remove. */
const invertSeederTags = (command: Extract<Command, { type: "updateSeederTags" }>): Command => ({
  type: "updateSeederTags",
  targets: command.targets,
  ...(command.remove === undefined
    ? {}
    : { add: command.remove }),
  ...(command.add === undefined
    ? {}
    : { remove: command.add }),
});

/**
 * Returns a command doing the wrong thing to the right target: remove instead of add, delete
 * instead of move or rename, and so on.
 *
 * @example
 * changeAction({ type: "moveSeeders", targets: { seeders: ["Amulets"] }, toCategory: "Jewels" }, state, 7);
 * // → { type: "deleteSeeders", targets: { seeders: ["Amulets"] } }
 */
export function changeAction(command: Command, state: PanelState, seed: number): Command | undefined {
  const pick = deriveSeed(seed, "action");

  if (command.type === "updateSeeders") return invertUpdate(command);
  if (command.type === "updateSeederTags") return invertSeederTags(command);
  if (command.type === "updateTagSeeder") return invertTagSeederUpdate(command);
  if (command.type === "moveSeeders") return { type: "deleteSeeders", targets: command.targets };
  if (command.type === "deleteSeeders") return { type: "moveSeeders", targets: command.targets, toCategory: pickOtherCategory(state, [], pick) };
  if (command.type === "createSeeder") return { type: "createCategory", category: command.seeder };
  if (command.type === "createCategory") return { type: "createSeeder", category: pickOne(Object.keys(state.categories), "a category", pick), seeder: command.category };
  if (command.type === "createTagSeeder") return { type: "createSeeder", category: pickOne(Object.keys(state.categories), "a category", pick), seeder: command.name };
  if (command.type === "deleteTagSeeder") return { type: "rename", target: "tagSeeder", name: command.name, to: drawNewName(state, pick) };
  if (command.type === "rename" && command.target === "category") return { type: "deleteCategory", category: command.name };
  if (command.type === "rename" && command.target === "tagSeeder") return { type: "deleteTagSeeder", name: command.name };
  if (command.type === "rename") return { type: "deleteSeeders", targets: { seeders: [command.name] } };
  if (command.type === "deleteCategory") return { type: "deleteSeeders", targets: { categories: [command.category] } };
  return undefined;
}
