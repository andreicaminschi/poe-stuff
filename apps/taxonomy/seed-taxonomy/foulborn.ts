import type { FoulbornMap } from "@poe/repoe/get-foulborn-map.types";
import type { AuthoredRow, AuthoredTable, TaxonomyTable } from "../types.ts";

const slug = (field: string): string =>
  field
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * The row for an unidentified foulborn unique on one base.
 *
 * On the ground a foulborn unique is unidentified, and unidentified it is its base and the
 * tag — a filter cannot say which unique, and PoeWatch prices it the same way, as
 * `Unidentified Foulborn <base>`. So the row is one per base, not one per unique: its name
 * is the base's, so `BaseType` can be read off it, and the price selector names the listing.
 *
 * The row authors no conditions of its own. `Rarity Unique` and `Foulborn True` are what the
 * category says, once, in `categories.json`, and every row under it is the base name laid
 * over that.
 */
const foulbornRow = (baseName: string): AuthoredRow => ({
  name: baseName,
  category: "foulborn-unique",
  subcategory: null,
  isUnique: true,
  reason:
    "A foulborn unique drops unidentified, and unidentified it is its base and the tag. No source has a row for that: the trade list names the unique, the game's data names the base. This row is the base with the tag, priced off PoeWatch's unidentified listing.",
  price: { name: `Unidentified Foulborn ${baseName}` },
});

/**
 * One authored row per base a foulborn unique rolls on.
 *
 * Which uniques go foulborn is the map's to say — nothing in the game's own files does. Which
 * base each one rolls on is already in the items table: a unique is keyed `base:Name`, so
 * the part before the colon is the base, and the base row's own name is what PoeWatch lists
 * the unidentified form under.
 *
 * Only those bases, and not every base a unique exists on. A base no foulborn unique rolls
 * on would be a row nothing ever drops, priced off a listing that does not exist. Keyed by
 * the base's name rather than its id, because two ids with one name are one `BaseType` and
 * one row is all a filter can write.
 */
export function foulbornRows(
  items: TaxonomyTable,
  foulborn: FoulbornMap,
): AuthoredTable {
  const basesByUnique = new Map<string, string[]>();

  for (const key of Object.keys(items)) {
    const colon = key.indexOf(":");
    if (colon === -1) continue;

    const name = key.slice(colon + 1);
    const seen = basesByUnique.get(name);
    if (seen === undefined) basesByUnique.set(name, [key.slice(0, colon)]);
    else seen.push(key.slice(0, colon));
  }

  const table: Record<string, AuthoredRow> = {};

  for (const unique of Object.keys(foulborn)) {
    for (const base of basesByUnique.get(unique) ?? []) {
      const row = items[base];
      if (row === undefined) continue;

      table[`authored/foulborn-${slug(row.name)}`] = foulbornRow(row.name);
    }
  }

  return table;
}
