import type { ItemRow } from "./list-item-rows.ts";
import { matchesSearch } from "./matches-search.ts";

export type ItemFilters = {
  readonly categories: readonly string[];
  readonly seeders: readonly string[];
  readonly tags: readonly string[];
  readonly search: string;
};

/** Keeps the rows every non-empty filter matches. A tag matches the seeder's tags or a tag seeder's. */
export const filterItemRows = (rows: readonly ItemRow[], filters: ItemFilters): readonly ItemRow[] =>
  rows.filter((row) =>
    (filters.categories.length === 0 || filters.categories.includes(row.category))
    && (filters.seeders.length === 0 || row.seeders.some((seeder) => filters.seeders.includes(seeder)))
    && (filters.tags.length === 0 || [...row.seederTags, ...row.tagSeederTags].some((tag) => filters.tags.includes(tag)))
    && matchesSearch(row, filters.search));
