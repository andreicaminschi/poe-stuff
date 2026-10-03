import { canonicalJson } from "../canonical-json.ts";
import type { Category, ItemData } from "../types.ts";

type Panel = { readonly categories: readonly Category[]; readonly itemData: readonly ItemData[] };

const byName = <T extends { readonly name: string }>(entries: readonly T[]): readonly T[] =>
  [...entries].sort((left, right) => left.name.localeCompare(right.name));

const sortedText = (values: readonly string[] | undefined): readonly string[] => [...(values ?? [])].sort();

/** Orders everything whose order carries no meaning: categories, seeders, items and their lists. Low, Sonar 1. */
function normalizePanel(panel: Panel): unknown {
  return {
    categories: byName(panel.categories).map((category) => ({
      name: category.name,
      seeders: byName(category.seeders).map((seeder) => ({
        name: seeder.name,
        tags: sortedText(seeder.tags),
        knownItems: sortedText(seeder.knownItems),
        conditions: Object.fromEntries(Object.entries(seeder.conditions).map(([key, values]) => [key, values.map((value) => JSON.stringify(value)).sort()])),
      })),
    })),
    itemData: byName(panel.itemData).map((item) => ({ name: item.name, tags: sortedText(item.tags), knownItems: sortedText(item.knownItems) })),
  };
}

/** Says whether two panels hold the same data, order aside. Low, Sonar 0. */
export const isSamePanel = (left: Panel, right: Panel): boolean =>
  canonicalJson(normalizePanel(left)) === canonicalJson(normalizePanel(right));
