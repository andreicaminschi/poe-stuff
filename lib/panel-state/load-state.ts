import { generateItems, listClashes, type GeneratedItem } from "./generate-items.ts";
import type { Bag, ConditionOperator, ConditionValues, PanelState, Seeder, SplitSettings } from "./types.ts";

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

/** Writes one stored value with its operator: `[8,8]` as `= 8`, `[9,11]` as `range 9-11`, anything else as `=`. */
function convertValue(value: unknown): readonly [string, ConditionOperator] {
  if (!Array.isArray(value)) return [String(value), "="];
  if (value[0] === value[1]) return [String(value[0]), "="];
  return [`${String(value[0])}-${String(value[1])}`, "range"];
}

/** Turns a list of values into a bag, or nothing when the list is empty. */
function buildBag(values: readonly string[]): Bag | undefined {
  if (values.length === 0) return undefined;
  return Object.fromEntries(values.map((value) => [value, true] as const));
}

/** Turns one stored seeder into its keyed form, leaving out every empty part. */
function buildSeeder(seeder: FileSeeder): Seeder {
  const conditions = Object.entries(seeder.conditions).flatMap(([name, values]) => (values.length === 0
    ? []
    : [[name, Object.fromEntries(values.map(convertValue))] as const]));
  const tags = buildBag(seeder.tags ?? []);
  const names = buildBag(seeder.knownItems ?? []);

  return {
    ...(conditions.length === 0
      ? {}
      : { conditions: Object.fromEntries(conditions) }),
    ...(tags === undefined
      ? {}
      : { tags }),
    ...(names === undefined
      ? {}
      : { names }),
  };
}

/** Returns the conditions with one BaseType value taken out, dropping BaseType when it empties. */
function dropBaseType(conditions: Readonly<Record<string, ConditionValues>>, baseType: string): Readonly<Record<string, ConditionValues>> {
  const kept = Object.entries(conditions.BaseType ?? {}).filter(([value]) => value !== baseType);
  const others = Object.entries(conditions).filter(([name]) => name !== "BaseType");

  return Object.fromEntries(kept.length === 0
    ? others
    : [...others, ["BaseType", Object.fromEntries(kept)] as const]);
}

/** Returns the state with one clash settled: the later category's seeder loses the item's BaseType. Throws when the item has no single BaseType. */
function settleClash(state: PanelState, item: GeneratedItem): PanelState {
  const baseType = item.conditions.find((entry) => entry.condition === "BaseType");
  const values = Object.keys(baseType?.values ?? {});
  const value = values[0];

  if (values.length !== 1 || value === undefined) throw new Error(`Import: "${item.key}" is output by two categories.`);
  const category = state.categories[item.category] ?? {};
  const seeder = category.seeders?.[item.seeder] ?? {};
  const { conditions: stored, ...rest } = seeder;
  const conditions = dropBaseType(stored ?? {}, value);
  const settled: Seeder = Object.keys(conditions).length === 0
    ? rest
    : { ...rest, conditions };
  return { ...state, categories: { ...state.categories, [item.category]: { seeders: { ...category.seeders, [item.seeder]: settled } } } };
}

/** Returns the state with every cross-category clash settled. The category listed first keeps the item. */
function settleClashes(state: PanelState, order: readonly string[], splitDefaults: SplitSettings): PanelState {
  const items = generateItems(state, splitDefaults);
  const clash = listClashes(items)[0];

  if (clash === undefined) return state;
  const keeper = order.find((name) => clash.categories.includes(name));
  const losers = items.filter((item) => item.key === clash.key && item.category !== keeper);
  return settleClashes(losers.reduce(settleClash, state), order, splitDefaults);
}

/**
 * Turns a stored `categories.json` into the keyed state the panel works on. `[8,8]` becomes
 * `= 8`, any other pair `range a-b`, everything else `=`. `knownItems` become `names`. When two
 * categories output one item, the later category's seeder loses that BaseType.
 *
 * @example
 * loadState({ categories: [{ name: "Uniques", seeders: [{ name: "Gold Ring uniques", conditions: { ItemLevel: [[68, 100]] }, knownItems: ["Andvarius"] }] }] }, {});
 * // → { categories: { Uniques: { seeders: { "Gold Ring uniques": { conditions: { ItemLevel: { "68-100": "range" } }, names: { Andvarius: true } } } } }, items: {} }
 */
export function loadState(file: CategoriesFile, splitDefaults: SplitSettings): PanelState {
  const state: PanelState = {
    categories: Object.fromEntries(file.categories.map((category) => [category.name, category.seeders.length === 0
      ? {}
      : { seeders: Object.fromEntries(category.seeders.map((seeder) => [seeder.name, buildSeeder(seeder)])) }])),
    items: {},
  };

  return settleClashes(state, file.categories.map((category) => category.name), splitDefaults);
}
