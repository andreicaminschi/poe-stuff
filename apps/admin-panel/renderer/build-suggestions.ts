import type { Category } from "../types.ts";
import type { SeededItem } from "./generate-items.ts";
import { matchItem, type Scope } from "./match-item.ts";
import { formatSeederKey } from "./seeder-key.ts";
import { sortSeeders } from "./sort-seeders.ts";

export type Suggestion =
  | { readonly kind: "search"; readonly label: string; readonly count: number }
  | { readonly kind: "category"; readonly label: string; readonly count: number }
  | { readonly kind: "seeder"; readonly label: string; readonly key: string; readonly category: string; readonly count: number };

/**
 * Builds the omnibar dropdown: the search itself when there is a query, then the unpicked
 * categories whose name matches, then the unpicked seeders in scope whose name matches. Seeders
 * come from the picked categories, or every category when none is picked. Medium, Sonar 2.
 */
export function buildSuggestions(
  categories: readonly Category[],
  items: readonly SeededItem[],
  itemCounts: ReadonlyMap<string, number>,
  scope: Scope,
): readonly Suggestion[] {
  const query = scope.query.trim().toLowerCase();
  const hits = (name: string) => name.toLowerCase().includes(query);
  const countWhere = (test: (item: SeededItem) => boolean) => items.filter(test).length;

  const search: Suggestion[] = query === ""
    ? []
    : [{ kind: "search", label: `Items matching "${scope.query.trim()}"`, count: countWhere((item) => matchItem(item, scope)) }];

  const categoryHits: Suggestion[] = categories
    .filter((category) => !scope.categories.includes(category.name) && hits(category.name))
    .map((category) => ({ kind: "category", label: category.name, count: countWhere((item) => item.category === category.name) }));

  const inScope = scope.categories.length === 0
    ? categories
    : categories.filter((category) => scope.categories.includes(category.name));

  const seederHits: Suggestion[] = inScope.flatMap((category) => sortSeeders(category.seeders)
    .map((seeder) => ({ seeder, key: formatSeederKey(category.name, seeder.name) }))
    .filter(({ seeder, key }) => !scope.seeders.includes(key) && hits(seeder.name))
    .map(({ seeder, key }) => ({
      kind: "seeder" as const,
      label: seeder.name,
      key,
      category: category.name,
      count: itemCounts.get(key) ?? 0,
    })));

  return [...search, ...categoryHits, ...seederHits];
}
