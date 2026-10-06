import type { PanelState } from "./types.ts";

/** Tells whether an empty map is allowed here: the roots and the entities (a category, a seeder, an item). Only bags must never be empty. */
function allowsEmpty(path: readonly string[]): boolean {
  if (path.length === 1) return true;
  if (path.length === 2) return path[0] === "categories" || path[0] === "items";
  return path.length === 4 && path[0] === "categories" && path[2] === "seeders";
}

/** Lists the places a value breaks the keyed shape: a list, a stored empty map, or a leaf that is not `true`. */
function listShapeProblems(value: unknown, path: readonly string[]): readonly string[] {
  const where = path.join(".");

  if (Array.isArray(value)) return [`${where} is a list, not a map`];
  if (typeof value !== "object" || value === null) return value === true
    ? []
    : [`${where} holds ${JSON.stringify(value)}, not true`];
  if (Object.keys(value).length === 0 && !allowsEmpty(path)) return [`${where} is empty and should be left out`];
  return Object.entries(value).flatMap(([key, child]) => listShapeProblems(child, [...path, key]));
}

/** Lists every seeder name held by more than one category. */
function listRepeatedSeeders(state: PanelState): readonly string[] {
  const owners = Object.entries(state.categories).flatMap(([category, entry]) => Object.keys(entry.seeders ?? {}).map((seeder) => ({ category, seeder })));

  return [...new Set(owners.map((owner) => owner.seeder))].flatMap((seeder) => {
    const categories = owners.filter((owner) => owner.seeder === seeder).map((owner) => owner.category);
    return categories.length > 1
      ? [`seeder "${seeder}" is in ${categories.join(", ")}`]
      : [];
  });
}

/**
 * Lists every way a state breaks the contract `@util/diff-summary` relies on: keyed maps only, no
 * stored empty bag, and one category per seeder name. Empty when the state holds.
 */
export const checkState = (state: PanelState): readonly string[] => [
  ...listRepeatedSeeders(state),
  ...Object.entries(state).flatMap(([key, value]) => listShapeProblems(value, [key])),
];
