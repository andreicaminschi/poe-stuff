import type { BaseItems } from "@poe/repoe/get-base-items.types";
import type { Gems } from "@poe/repoe/get-gems.types";
import type { AuthoredEntry, TaxonomyTable } from "./types.ts";

const QUEST_ITEM = "QuestItem";
const JUNK = ["[", "]", "WIP", "MTX"];

const rowOf = (name: string, category: string): AuthoredEntry => ({
  name,
  displayName: name,
  category,
  subcategory: null,
});

const isSeeded = (name: string, itemClass: string): boolean =>
  name !== "" && itemClass !== QUEST_ITEM && !JUNK.some((part) => name.includes(part));

export function seedItems(baseItems: BaseItems, gems: Gems): TaxonomyTable {
  const bases = Object.entries(baseItems)
    .filter(([, base]) => isSeeded(base.name, base.item_class))
    .map(([key, base]) => [key, rowOf(base.name, base.item_class)] as const);

  const transfigured = Object.entries(gems).flatMap(([key, gem]) => {
    if (gem.baseTypeName === undefined || baseItems[key] !== undefined) return [];

    const base = baseItems[gem.gameId];
    if (base === undefined || !isSeeded(gem.baseTypeName, base.item_class)) return [];

    return [[key, rowOf(gem.baseTypeName, base.item_class)] as const];
  });

  return Object.fromEntries([...bases, ...transfigured]);
}
