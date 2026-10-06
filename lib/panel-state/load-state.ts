import type { Bag, PanelState, Seeder } from "./types.ts";

type FileSeeder = {
  readonly name: string;
  readonly conditions: Readonly<Record<string, readonly unknown[]>>;
  readonly tags?: readonly string[];
  readonly knownItems?: readonly string[];
};

/** The shape of a version's `categories.json`: lists, as the old panel stored them. */
export type CategoriesFile = {
  readonly categories: readonly { readonly name: string; readonly seeders: readonly FileSeeder[] }[];
};

/** Writes one stored value as a bag key: a range as `"68-100"`, anything else as it prints. */
const formatKey = (value: unknown): string => (Array.isArray(value)
  ? `${String(value[0])}-${String(value[1])}`
  : String(value));

/** Turns a list of values into a bag, or nothing when the list is empty. */
function buildBag(values: readonly unknown[]): Bag | undefined {
  if (values.length === 0) return undefined;
  return Object.fromEntries(values.map((value) => [formatKey(value), true] as const));
}

/** Turns one stored seeder into its keyed form, leaving out every empty part. */
function buildSeeder(seeder: FileSeeder): Seeder {
  const conditions = Object.entries(seeder.conditions).flatMap(([name, values]) => {
    const bag = buildBag(values);
    return bag === undefined
      ? []
      : [[name, bag] as const];
  });
  const tags = buildBag(seeder.tags ?? []);
  const knownItems = buildBag(seeder.knownItems ?? []);

  return {
    ...(conditions.length === 0
      ? {}
      : { conditions: Object.fromEntries(conditions) }),
    ...(tags === undefined
      ? {}
      : { tags }),
    ...(knownItems === undefined
      ? {}
      : { knownItems }),
  };
}

/** Lists every known item name the seeders hold, once each. */
const listKnownItems = (file: CategoriesFile): readonly string[] =>
  [...new Set(file.categories.flatMap((category) => category.seeders.flatMap((seeder) => seeder.knownItems ?? [])))];

/**
 * Turns a stored `categories.json` into the keyed state the commands and the diff summary work
 * on. A category with no seeders is an empty map. Every known item gets an empty item entry, so
 * a later tag edit reads as an edit and not as the item appearing.
 *
 * @example
 * loadState({ categories: [{ name: "Uniques", seeders: [{ name: "Gold Ring uniques", conditions: { ItemLevel: [[68, 100]] }, knownItems: ["Andvarius"] }] }] });
 * // → { categories: { Uniques: { seeders: { "Gold Ring uniques": { conditions: { ItemLevel: { "68-100": true } }, knownItems: { Andvarius: true } } } } }, items: { Andvarius: {} } }
 */
export const loadState = (file: CategoriesFile): PanelState => ({
  categories: Object.fromEntries(file.categories.map((category) => [category.name, category.seeders.length === 0
    ? {}
    : { seeders: Object.fromEntries(category.seeders.map((seeder) => [seeder.name, buildSeeder(seeder)])) }])),
  items: Object.fromEntries(listKnownItems(file).map((name) => [name, {}])),
});
