import type { GGGItemGroup } from "@poe/ggg/get-item-data.types";
import type { ItemData } from "@poe/poe-watch/get-compact-data.types";
import type {
  CorruptionOutcome,
  ItemCorruptions,
} from "@poe/poe-watch/get-corruption-data.types";
import type { Item, UniqueListing } from "../item.ts";

/** PoeWatch's frame for a unique. */
const UNIQUE_FRAME = 3;

const FOULBORN = "Foulborn ";

/**
 * The unique a listing is of. `Foulborn Headhunter (Culling)` is Headhunter: the prefix is
 * the tag, and the parentheses are the form.
 */
const uniqueOf = (listing: string): string =>
  listing.replace(/^Foulborn /, "").replace(/ \([^)]*\)$/, "");

/** The one with the most listings behind it, ties to the higher mean. */
const mostListed = <T extends { readonly daily: number; readonly mean: number }>(
  candidates: readonly T[],
): T | undefined =>
  candidates.reduce<T | undefined>(
    (best, one) =>
      best === undefined ||
      one.daily > best.daily ||
      (one.daily === best.daily && one.mean > best.mean)
        ? one
        : best,
    undefined,
  );

/** Which bases the trade list says each unique rolls on. Sixty roll on more than one. */
function basesByUnique(groups: readonly GGGItemGroup[]): ReadonlyMap<string, string[]> {
  const bases = new Map<string, string[]>();

  for (const group of groups) {
    for (const entry of group.items) {
      if (entry.kind !== "unique") continue;

      const seen = bases.get(entry.name);
      if (seen === undefined) bases.set(entry.name, [entry.baseType]);
      else if (!seen.includes(entry.baseType)) seen.push(entry.baseType);
    }
  }

  return bases;
}

/**
 * Every unique-frame listing, one entry per distinct name, and its corruption outcomes.
 *
 * PoeWatch lists one name several times — Cloak of Flame at three link counts — and the
 * entry is the most-listed of them. Its corruption outcomes are gathered off every listing
 * of the name, because each listing carries its own, and an outcome that appears on two is
 * taken once, again the most-listed.
 */
function listedUniques(
  listings: readonly ItemData[],
  corruptions: readonly ItemCorruptions[],
): readonly UniqueListing[] {
  const byName = new Map<string, ItemData[]>();
  for (const listing of listings) {
    if (listing.frame !== UNIQUE_FRAME) continue;

    const seen = byName.get(listing.name);
    if (seen === undefined) byName.set(listing.name, [listing]);
    else seen.push(listing);
  }

  const outcomesById = new Map(corruptions.map((item) => [item.item_id, item.corruptions]));

  const entries: UniqueListing[] = [];

  for (const [name, same] of byName) {
    const chosen = mostListed(same);
    if (chosen === undefined) continue;

    const isFoulborn = name.startsWith(FOULBORN);

    entries.push({ name, meanPrice: chosen.mean, isFoulborn, corrupted: false });

    const outcomes = new Map<string, CorruptionOutcome[]>();
    for (const listing of same) {
      for (const outcome of outcomesById.get(listing.id) ?? []) {
        const seen = outcomes.get(outcome.name);
        if (seen === undefined) outcomes.set(outcome.name, [outcome]);
        else seen.push(outcome);
      }
    }

    for (const [implicit, same] of outcomes) {
      const best = mostListed(same);
      if (best === undefined) continue;

      entries.push({
        name: `${name} (${implicit})`,
        meanPrice: best.mean,
        isFoulborn,
        corrupted: true,
      });
    }
  }

  return entries;
}

/**
 * Hangs every unique PoeWatch lists off the base it rolls on.
 *
 * Three files meet here and each says one thing. The trade list says which base a unique
 * rolls on. PoeWatch's listings say what each form of it asks — the plain one, the foulborn
 * one with its tag, the one with two abyssal sockets — and its corruption outcomes say what
 * each implicit it can roll sells for. The base row, found by the name the trade list
 * gives, gets all of it.
 *
 * A listing whose unique the trade list does not name goes nowhere: `Unidentified Foulborn
 * Crusader Chainmail` is a base with a tag and no unique behind it yet, and a name the list
 * has stopped carrying is one nobody can search for. A base two ids share gets the list on
 * both, the way `tradable` marks both.
 */
export function withUniques(
  rows: readonly Item[],
  groups: readonly GGGItemGroup[],
  listings: readonly ItemData[],
  corruptions: readonly ItemCorruptions[],
): readonly Item[] {
  const bases = basesByUnique(groups);
  const perBase = new Map<string, UniqueListing[]>();

  for (const entry of listedUniques(listings, corruptions)) {
    for (const base of bases.get(uniqueOf(entry.name)) ?? []) {
      const seen = perBase.get(base);
      if (seen === undefined) perBase.set(base, [entry]);
      else seen.push(entry);
    }
  }

  return rows.map((item) => {
    if (item.name === null || item.isUnique) return item;

    const uniques = perBase.get(item.name);
    if (uniques === undefined) return item;

    return {
      ...item,
      uniques: [...uniques].sort((a, b) => a.name.localeCompare(b.name)),
    };
  });
}
