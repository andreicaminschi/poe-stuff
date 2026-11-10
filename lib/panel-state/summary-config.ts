import type { SummaryConfig, Tree } from "@util/diff-summary/types";
import type { Category, PanelState, SeederTags } from "./types.ts";
import { VALUE_SETS } from "./value-sets.ts";

/** The words `summarizeDiff` uses for `toSummaryTree`'s shape. The runtime and the training generator share it. */
export const SUMMARY_CONFIG: SummaryConfig = {
  levels: {
    "categories.*": { one: "category", many: "categories" },
    "categories.*.seeders.*": { one: "seeder", many: "seeders", unique: true },
    "categories.*.seeders.*.tags.*": { one: "tag", many: "tags" },
    "categories.*.seeders.*.names.*": { one: "known item", many: "known items" },
    "categories.*.seeders.*.conditions.*": { one: "condition", many: "conditions" },
    "items.*": { one: "item", many: "items" },
    "tagSeeders.*": { one: "tag seeder", many: "tag seeders", unique: true },
    "tagSeeders.*.conditions.*": { one: "condition", many: "conditions" },
    "tagSeeders.*.tags.*": { one: "tag", many: "tags" },
  },
  valueNames: Object.fromEntries(Object.entries(VALUE_SETS).map(([condition, sets]) => [`categories.*.seeders.*.conditions.${condition}`, sets])),
};

type Projected = { readonly tags: readonly (SeederTags | undefined)[]; readonly tree: unknown };

const projected = new WeakMap<Category, Projected>();

/** Writes each seeder's tags back under it, reusing the last projection while its seeders' tags are the same objects. */
function projectCategory(category: Category, seederTags: PanelState["seederTags"]): unknown {
  const seeders = Object.entries(category.seeders ?? {});
  const tags = seeders.map(([name]) => seederTags[name]);
  const cached = projected.get(category);

  if (tags.every((entry) => entry === undefined)) return category;
  if (cached !== undefined && cached.tags.length === tags.length && cached.tags.every((entry, at) => entry === tags[at])) return cached.tree;
  const tree = { seeders: Object.fromEntries(seeders.map(([name, seeder]) => {
    const entry = seederTags[name];
    return [name, entry === undefined
      ? seeder
      : { ...seeder, tags: entry.tags }];
  })) };
  projected.set(category, { tags, tree });
  return tree;
}

/**
 * The state as the Judge reads it: each seeder's tags sit under that seeder, so tagging reads
 * `seeder "Rings": tag chase added` and bulk edits group per category. Unchanged categories keep
 * their identity, so `summarizeDiff` still prunes them.
 *
 * @example
 * toSummaryTree({ categories: { Bases: { seeders: { Rings: {} } } }, items: {}, seederTags: { Rings: { tags: { chase: true } } }, tagSeeders: {} });
 * // → { categories: { Bases: { seeders: { Rings: { tags: { chase: true } } } } }, items: {}, tagSeeders: {} }
 */
export const toSummaryTree = (state: PanelState): Tree => ({
  categories: Object.fromEntries(Object.entries(state.categories).map(([name, category]) => [name, projectCategory(category, state.seederTags)])),
  items: state.items,
  tagSeeders: state.tagSeeders,
});
