import type { Seeder } from "../types.ts";

/** Returns the seeders sorted by name, for the screen. Low, Sonar 0. */
export const sortSeeders = (seeders: readonly Seeder[]): readonly Seeder[] =>
  seeders.toSorted((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));
