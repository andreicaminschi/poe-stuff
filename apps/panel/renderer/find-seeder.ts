import type { PanelState } from "@poe/panel-state/types";
import { listSeeders, type PlacedSeeder } from "./list-seeders.ts";

/** The stored seeder with this exact name, with its category. */
export const findSeeder = (state: PanelState, name: string): PlacedSeeder | undefined =>
  listSeeders(state).find((entry) => entry.name === name);
