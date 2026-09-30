import type { SeededItem } from "./generate-items.ts";
import { formatSeederKey } from "./seeder-key.ts";

export type Scope = {
  readonly categories: readonly string[];
  readonly seeders: readonly string[];
  readonly query: string;
};

/**
 * Tells whether an item is in the picked categories and seeders, and holds every word of the
 * query in its base type or tags. An empty pick means all. Low, Sonar 3.
 */
export function matchItem(item: SeededItem, scope: Scope): boolean {
  if (scope.categories.length > 0 && !scope.categories.includes(item.category)) return false;
  if (scope.seeders.length > 0 && !scope.seeders.includes(formatSeederKey(item.category, item.seeder))) return false;

  return scope.query.toLowerCase().split(/\s+/).filter(Boolean).every((word) => item.search.includes(word));
}
