import type { PanelState } from "@poe/panel-state/types";

/** Every value the seeders hold for one condition, sorted, once each. */
export function listConditionValues(state: PanelState, condition: string): readonly string[] {
  const values = Object.values(state.categories).flatMap((category) =>
    Object.values(category.seeders ?? {}).flatMap((seeder) => Object.keys(seeder.conditions?.[condition] ?? {})));
  return [...new Set(values)].toSorted();
}
