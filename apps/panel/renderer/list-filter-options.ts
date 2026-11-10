import type { PanelState } from "@poe/panel-state/types";
import { listSeeders } from "./list-seeders.ts";
import type { FilterSection } from "./store.ts";

/** Every value one filter section can pick, sorted. */
export function listFilterOptions(state: PanelState, section: FilterSection): readonly string[] {
  if (section === "category") return Object.keys(state.categories).toSorted();
  if (section === "seeder") return listSeeders(state).map((entry) => entry.name).toSorted();
  const seederTags = Object.values(state.seederTags).flatMap((entry) => Object.keys(entry.tags));
  const tagSeederTags = Object.values(state.tagSeeders).flatMap((entry) => Object.keys(entry.tags));
  return [...new Set([...seederTags, ...tagSeederTags])].toSorted();
}
