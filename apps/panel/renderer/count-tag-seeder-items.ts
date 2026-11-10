import type { ItemRow } from "./list-item-rows.ts";

/** Counts the generated items each tag seeder tags, in one pass over the rows. */
export function countTagSeederItems(rows: readonly ItemRow[]): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();

  for (const row of rows) {
    for (const match of row.tagSeeders) counts.set(match.name, (counts.get(match.name) ?? 0) + 1);
  }
  return counts;
}
