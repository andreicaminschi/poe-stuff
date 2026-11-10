import type { GeneratedItem } from "./generate-items.ts";
import type { PanelState, TagSeeder } from "./types.ts";

/** One tag seeder that matched an item, and the tags it gives. */
export type TagSeederMatch = { readonly name: string; readonly tags: readonly string[] };

/** An item's tags by where they come from: its seeder, and every tag seeder it matches. */
export type ItemTags = {
  readonly seederTags: readonly string[];
  readonly tagSeeders: readonly TagSeederMatch[];
};

type CompiledTagSeeder = {
  readonly name: string;
  readonly conditions: readonly (readonly [string, ReadonlySet<string>])[];
  readonly tags: readonly string[];
};

const compiled = new WeakMap<PanelState["tagSeeders"], readonly CompiledTagSeeder[]>();

/** Turns each tag seeder into value sets once per tagSeeders map. */
function compileTagSeeders(tagSeeders: PanelState["tagSeeders"]): readonly CompiledTagSeeder[] {
  const cached = compiled.get(tagSeeders);
  if (cached !== undefined) return cached;

  const built = Object.entries(tagSeeders).map(([name, tagSeeder]: [string, TagSeeder]) => ({
    name,
    conditions: Object.entries(tagSeeder.conditions).map(([condition, values]) => [condition, new Set(Object.keys(values))] as const),
    tags: Object.keys(tagSeeder.tags),
  }));
  compiled.set(tagSeeders, built);
  return built;
}

/** Tells whether the item holds, for every condition, at least one listed value. Operators are ignored. */
function matchesItem(tagSeeder: CompiledTagSeeder, values: ReadonlyMap<string, readonly string[]>): boolean {
  return tagSeeder.conditions.every(([condition, wanted]) => (values.get(condition) ?? []).some((value) => wanted.has(value)));
}

/**
 * Lists one item's tags: its seeder's tags, then every tag seeder whose conditions it meets. Within
 * a condition any listed value is enough, and every condition must be met.
 *
 * @example
 * listItemTags(state, { key: "BaseType = Royal Plate, Rarity = Normal | Magic | Rare", seeder: "Body Armors - armor", … });
 * // → { seederTags: ["str", "armor"], tagSeeders: [{ name: "Body Armors endgame", tags: ["endgame"] }] }
 */
export function listItemTags(state: PanelState, item: GeneratedItem): ItemTags {
  const values = new Map(item.conditions.map((entry) => [entry.condition, Object.keys(entry.values)] as const));

  return {
    seederTags: Object.keys(state.seederTags[item.seeder]?.tags ?? {}),
    tagSeeders: compileTagSeeders(state.tagSeeders)
      .filter((tagSeeder) => matchesItem(tagSeeder, values))
      .map(({ name, tags }) => ({ name, tags })),
  };
}
