import type { FilterItem } from "@poe/filter-eval/filter-ast";
import type { EntryRow, MarketEntry } from "./types.ts";

const FOULBORN = "foulborn";

/**
 * Finds every unique listing on a unique item's base in the same form, foulborn or not and
 * corrupted or not. The item alone cannot say which unique it is, so each one counts as correct.
 *
 * @example
 * const uniqueBasesByName = new Map([["Ruby Ring", { key: "Ruby Ring", name: "Ruby Ring", uniques: [
 *   { subcategory: null, listings: [
 *     { corrupted: false, poeWatch: mingsHeart },
 *     { corrupted: true, poeWatch: mingsHeartCorrupted },
 *   ] },
 * ] }]]);
 * findUniqueEntries({ Rarity: "Unique", BaseType: "Ruby Ring", Corrupted: false }, uniqueBasesByName);
 * // → [mingsHeart]
 */
export function findUniqueEntries(item: FilterItem, uniqueBasesByName: ReadonlyMap<string, EntryRow>): readonly MarketEntry[] {
  if (typeof item.BaseType !== "string") return [];
  const base = uniqueBasesByName.get(item.BaseType);
  const subcategory = item.Foulborn === true
    ? FOULBORN
    : null;
  const corrupted = item.Corrupted === true;

  return (base?.uniques ?? [])
    .filter((group) => group.subcategory === subcategory)
    .flatMap((group) => group.listings)
    .filter((listing) => listing.corrupted === corrupted)
    .map((listing) => listing.poeWatch);
}
