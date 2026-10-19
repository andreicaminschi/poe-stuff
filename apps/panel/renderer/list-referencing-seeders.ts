import type { PanelState } from "@poe/panel-state/types";
import { listSeeders, type PlacedSeeder } from "./list-seeders.ts";

/** Seeders naming this item as a known item. */
export const listReferencingSeeders = (seeders: readonly PlacedSeeder[], item: string): readonly PlacedSeeder[] =>
  seeders.filter(({ seeder }) => seeder.knownItems?.[item] === true);

/** Same, over the whole state. */
export const listSeedersOfItem = (state: PanelState, item: string): readonly PlacedSeeder[] =>
  listReferencingSeeders(listSeeders(state), item);
