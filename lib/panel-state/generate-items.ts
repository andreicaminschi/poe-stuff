import type { ConditionValues, PanelState, Seeder, SplitSettings } from "./types.ts";

/** One condition of an item's group: every value it holds, each with its operator. */
export type ItemCondition = { readonly condition: string; readonly values: ConditionValues };

/** One generated item. `key` is its whole condition group, written out. */
export type GeneratedItem = {
  readonly key: string;
  readonly category: string;
  readonly seeder: string;
  readonly conditions: readonly ItemCondition[];
};

/** Writes one condition's values as `Rarity = Normal | Magic`, or `ItemLevel range 1-49 | = 84` when operators differ. */
export function formatCondition({ condition, values }: ItemCondition): string {
  const entries = Object.entries(values);
  const operators = new Set(entries.map(([, operator]) => operator));
  const first = entries[0];

  if (operators.size === 1 && first !== undefined) return `${condition} ${first[1]} ${entries.map(([value]) => value).join(" | ")}`;
  return `${condition} ${entries.map(([value, operator]) => `${operator} ${value}`).join(" | ")}`;
}

/** Tells whether a condition splits on this seeder: its override, else the default, else yes. */
const splits = (seeder: Seeder, condition: string, defaults: SplitSettings): boolean =>
  seeder.split?.[condition] ?? defaults[condition] ?? true;

/** Lists one seeder's condition groups: one per combination of its splitting values. */
function listGroups(seeder: Seeder, defaults: SplitSettings): readonly (readonly ItemCondition[])[] {
  const conditions = Object.entries(seeder.conditions ?? {}).toSorted(([left], [right]) => left.localeCompare(right));

  if (conditions.length === 0) return [];
  return conditions.reduce<readonly (readonly ItemCondition[])[]>((groups, [condition, values]) => {
    const parts: readonly ItemCondition[] = splits(seeder, condition, defaults)
      ? Object.entries(values).map(([value, operator]) => ({ condition, values: { [value]: operator } }))
      : [{ condition, values }];
    return groups.flatMap((group) => parts.map((part) => [...group, part]));
  }, [[]]);
}

/**
 * Lists every item the state's seeders output. A seeder with no conditions outputs none.
 * Two seeders that output one group give the item twice, once per seeder.
 *
 * @example
 * generateItems(state, { Rarity: false });
 * // → [{ key: "EnchantmentPassiveNum = 2, Rarity = Normal | Magic", category: "Jewels", seeder: "Small", conditions: [...] }, ...]
 */
export const generateItems = (state: PanelState, defaults: SplitSettings): readonly GeneratedItem[] =>
  Object.entries(state.categories).flatMap(([category, entry]) =>
    Object.entries(entry.seeders ?? {}).flatMap(([seeder, value]) =>
      listGroups(value, defaults).map((conditions) => ({
        key: conditions.map(formatCondition).join(", "),
        category,
        seeder,
        conditions,
      }))));

/** Lists every item key two or more categories output, with those categories. */
export function listClashes(items: readonly GeneratedItem[]): readonly { readonly key: string; readonly categories: readonly string[] }[] {
  const owners = new Map<string, Set<string>>();

  for (const item of items) owners.set(item.key, (owners.get(item.key) ?? new Set()).add(item.category));
  return [...owners].flatMap(([key, categories]) => (categories.size > 1
    ? [{ key, categories: [...categories] }]
    : []));
}
