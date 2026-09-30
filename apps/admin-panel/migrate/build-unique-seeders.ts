import { readBaseType, type OldListing, type OldRow } from "./old-taxonomy.ts";
import type { Seeder } from "../types.ts";

const FRAGMENT_PIECES: Readonly<Record<string, readonly string[]>> = {
  "Vaal Aspect": ["Adorned Pieces", "Beauty", "Ambition", "Cooperation", "Curiosity"],
  "Primordial Fragment": [
    "Utmost Pieces",
    "Curio of Absorption",
    "Curio of Decay",
    "Curio of Potential",
    "Curio of Consumption",
  ],
};

/**
 * Lists the names in a listing field, which the old taxonomy wrote as one entry or several.
 * Medium, dense: Sonar 2.
 *
 * @example
 * listListingNames([{ name: "Mageblood" }, { name: "Headhunter" }]);
 * // → ["Mageblood", "Headhunter"]
 */
const listListingNames = (listing: OldListing | readonly OldListing[] | undefined): readonly string[] =>
  [listing ?? []].flat().flatMap((entry) => (entry.name === undefined
    ? []
    : [entry.name]));

/**
 * Lists the uniques a row stands for: the fragment pieces for the two fragment bases, else
 * every name its listings carry. High, dense: Sonar 2.
 *
 * @example
 * listKnownItems({ name: "Heavy Belt Uniques", baseType: "Heavy Belt", category: "unique",
 *   subcategory: "belt", variants: [{ listing: [{ name: "Mageblood" }] }] });
 * // → ["Mageblood"]
 */
const listKnownItems = (row: OldRow): readonly string[] =>
  FRAGMENT_PIECES[readBaseType(row)] ?? [
    ...listListingNames(row.listing),
    ...(row.variants ?? []).flatMap((variant) => listListingNames(variant.listing)),
  ];

/**
 * Builds one seeder per unique base, named "<Base> Uniques", with the uniques on that base as
 * its `knownItems`. `foulborn` sets the seeder's `Foulborn` value. Medium, Sonar 2.
 */
export function buildUniqueSeeders(rows: readonly OldRow[], foulborn: boolean): readonly Seeder[] {
  const knownItemsByBase = new Map<string, Set<string>>();

  for (const row of rows) {
    const knownItems = knownItemsByBase.get(readBaseType(row)) ?? new Set<string>();
    listKnownItems(row).forEach((name) => knownItems.add(name));
    knownItemsByBase.set(readBaseType(row), knownItems);
  }

  return [...knownItemsByBase].map(([baseType, knownItems]) => ({
    name: `${baseType} Uniques`,
    conditions: { BaseType: [baseType], Rarity: ["Unique"], Foulborn: [foulborn] },
    knownItems: [...knownItems],
    tags: [],
  }));
}
