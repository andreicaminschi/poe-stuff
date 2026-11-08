import type { PanelState } from "@poe/panel-state/types";
import { listSeeders } from "./list-seeders.ts";
import type { FilterSection } from "./store.ts";

/** Every value one filter section can pick, sorted. */
export function listFilterOptions(state: PanelState, section: FilterSection): readonly string[] {
  if (section === "category") return Object.keys(state.categories).toSorted();
  if (section === "seeder") return listSeeders(state).map((entry) => entry.name).toSorted();
  const seederTags = listSeeders(state).flatMap((entry) => Object.keys(entry.seeder.tags ?? {}));
  const itemTags = Object.values(state.items).flatMap((item) => Object.keys(item.tags ?? {}));
  return [...new Set([...seederTags, ...itemTags])].toSorted();
}
