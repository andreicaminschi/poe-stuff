import type { PanelState, Seeder } from "@poe/panel-state/types";

export type PlacedSeeder = { readonly category: string; readonly name: string; readonly seeder: Seeder };

/** Every seeder in the state, with its category. */
export const listSeeders = (state: PanelState): readonly PlacedSeeder[] =>
  Object.entries(state.categories).flatMap(([category, { seeders = {} }]) =>
    Object.entries(seeders).map(([name, seeder]) => ({ category, name, seeder })));
