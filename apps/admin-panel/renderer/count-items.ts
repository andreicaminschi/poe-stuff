import type { SeededItem } from "./generate-items.ts";
import { formatSeederKey } from "./seeder-key.ts";

/** Counts the items each seeder generates, keyed by seeder key, in one pass. */
export function countItemsBySeeder(items: readonly SeededItem[]): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();

  for (const item of items) {
    const key = formatSeederKey(item.category, item.seeder);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}
