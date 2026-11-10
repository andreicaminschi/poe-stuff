import type { Bag, Category, Item, PanelState, Seeder, SeederTags } from "@poe/panel-state/types";

/** A seeder as stored before tag seeders: it may carry tags. */
export type LegacySeeder = Seeder & { readonly tags?: Bag };

export type LegacyCategory = { readonly seeders?: Readonly<Record<string, LegacySeeder>> };

/** An item as stored before tag seeders: it may carry tags. */
export type LegacyItem = Item & { readonly tags?: Bag };

export type LegacyState = {
  readonly categories: Readonly<Record<string, LegacyCategory>>;
  readonly items: Readonly<Record<string, LegacyItem>>;
};

/** Returns the seeder without its tags. */
const stripSeeder = ({ tags: _tags, ...seeder }: LegacySeeder): Seeder => seeder;

/** Returns the category with every seeder's tags left out. */
export const stripCategory = (category: LegacyCategory): Category => (category.seeders === undefined
  ? {}
  : { seeders: Object.fromEntries(Object.entries(category.seeders).map(([name, seeder]) => [name, stripSeeder(seeder)])) });

/** Returns the item without its tags, or null when nothing else is left. */
export function stripItem({ tags: _tags, ...item }: LegacyItem): Item | null {
  return Object.keys(item).length === 0
    ? null
    : item;
}

/** Lists each seeder of the category that carries tags, with them. */
export const listSeederTags = (category: LegacyCategory): readonly (readonly [string, SeederTags])[] =>
  Object.entries(category.seeders ?? {}).flatMap(([name, seeder]) => (seeder.tags === undefined
    ? []
    : [[name, { tags: seeder.tags }] as const]));

/**
 * Moves every seeder's tags into `seederTags` and drops item tags, leaving an item with nothing
 * else out.
 *
 * @example
 * convertState({ categories: { Bases: { seeders: { Rings: { tags: { chase: true } } } } }, items: {} });
 * // → { categories: { Bases: { seeders: { Rings: {} } } }, items: {}, seederTags: { Rings: { tags: { chase: true } } }, tagSeeders: {} }
 */
export function convertState(state: LegacyState): PanelState {
  const items = Object.entries(state.items).flatMap(([key, item]) => {
    const stripped = stripItem(item);
    return stripped === null
      ? []
      : [[key, stripped] as const];
  });

  return {
    categories: Object.fromEntries(Object.entries(state.categories).map(([name, category]) => [name, stripCategory(category)])),
    items: Object.fromEntries(items),
    seederTags: Object.fromEntries(Object.values(state.categories).flatMap(listSeederTags)),
    tagSeeders: {},
  };
}
