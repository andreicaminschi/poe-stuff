import type { PanelState } from "@poe/panel-state/types";
import { listSeeders, type PlacedSeeder } from "./list-seeders.ts";

/** Seeders of the picked categories (all when none), narrowed to picked seeders, sorted by name. */
export function listScopedSeeders(state: PanelState, pickedCategories: readonly string[], pickedSeeders: readonly string[]): readonly PlacedSeeder[] {
  const inCategories = listSeeders(state).filter(({ category }) => pickedCategories.length === 0 || pickedCategories.includes(category));
  const picked = pickedSeeders.length === 0
    ? inCategories
    : inCategories.filter(({ name }) => pickedSeeders.includes(name));
  return [...picked].sort((left, right) => left.name.localeCompare(right.name));
}
