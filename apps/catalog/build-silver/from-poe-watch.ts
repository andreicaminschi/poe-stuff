import type { ItemData } from "@poe/poe-watch/get-compact-data.types";
import type { ItemCorruptions } from "@poe/poe-watch/get-corruption-data.types";
import type { ExchangeRatioItem } from "@poe/poe-watch/get-exchange-ratios.types";
import type { CorruptionOutcome } from "@poe/poe-watch/types";
import type { Listing, ListingMatch } from "@poe/taxonomy/types";
import type { Item, PricedVariant } from "../item.ts";
import { isSynthesised } from "./is-synthesised.ts";

type Price = { readonly mean: number; readonly lowConfidence: boolean };

/**
 * A listing name with the lines inside its parentheses in one order.
 *
 * PoeWatch lists a cluster jewel under its enchant — `Large Cluster Jewel (12% increased
 * Damage with Bows\n12% increased Damage Over Time with Bow Skills)` — and writes a two-line
 * enchant in an order the game's data does not share. The taxonomy names the listing in the
 * game's order, so both sides go through this before they are compared. Any other name has
 * no parentheses and comes back untouched.
 */
const listingKey = (name: string): string =>
  name.replace(
    /\(([^)]*)\)$/,
    (_, inner: string) => `(${inner.split("\n").sort().join("\n")})`,
  );

/** Display name to every listing PoeWatch has under it. */
function byName(listings: readonly ItemData[]): ReadonlyMap<string, ItemData[]> {
  const index = new Map<string, ItemData[]>();

  for (const listing of listings) {
    const key = listingKey(listing.name);
    const seen = index.get(key);
    if (seen === undefined) index.set(key, [listing]);
    else seen.push(listing);
  }

  return index;
}

/**
 * Whether every key the selector writes is equal on the listing.
 *
 * The keys are PoeWatch's own field names and the taxonomy validator has already refused any
 * other, so a plain property read is the whole comparison. A key the listing's category does
 * not carry reads `undefined` and fails to match, which is right: `gemLevel` on a base
 * selects nothing.
 */
const field = (listing: ItemData, key: string): unknown =>
  // Synthesis lives in the icon.
  key === "synthesised"
    ? isSynthesised(listing.icon)
    : (listing as unknown as Readonly<Record<string, unknown>>)[key];

const matches = (listing: ItemData, selector: ListingMatch): boolean =>
  Object.entries(selector).every(([key, value]) => field(listing, key) === value);

/** The most listed, ties to the higher mean. */
const mostListed = <T extends { readonly daily: number; readonly mean: number }>(
  candidates: readonly T[],
): T | undefined =>
  candidates.reduce<T | undefined>(
    (best, one) =>
      best === undefined || one.daily > best.daily || (one.daily === best.daily && one.mean > best.mean)
        ? one
        : best,
    undefined,
  );

/**
 * The one listing to read a price off.
 *
 * Every listing the selector agrees with, then the one most people are listing. Ties go to
 * the higher mean, so a cheap and a dear form with one listing each read as the dear one.
 * No selector keeps every listing, which is how a plain item prices at its most-listed form.
 */
function pick(
  listings: readonly ItemData[],
  selector: ListingMatch | undefined,
): ItemData | undefined {
  return mostListed(
    selector === undefined ? listings : listings.filter((listing) => matches(listing, selector)),
  );
}

/**
 * One corruption outcome of a unique, read off every listing of it.
 *
 * PoeWatch prices outcomes per listing id, and a unique listed at several forms carries the
 * same outcome on more than one, so the most-listed of them is read.
 */
function pickOutcome(
  listings: readonly ItemData[],
  corruption: string,
  outcomesById: ReadonlyMap<number, readonly CorruptionOutcome[]>,
): CorruptionOutcome | undefined {
  return mostListed(
    listings
      .flatMap((listing) => outcomesById.get(listing.id) ?? [])
      .filter((outcome) => outcome.name === corruption),
  );
}

const queriesOf = (listing: Listing | undefined): readonly (ListingMatch | undefined)[] => {
  if (listing === undefined) return [undefined];
  if (Array.isArray(listing)) return listing as readonly ListingMatch[];
  return [listing as ListingMatch];
};

/**
 * Attaches PoeWatch's mean to every row.
 *
 * Joined on the display name, the only thing the two share — PoeWatch carries no metadata
 * id. A name two ids share prices both.
 *
 * **The exchange first, listings second.** A row the Currency Exchange trades takes the
 * exchange's price: a volume-weighted mean of actual trades, where compact is what people
 * asked for. A Divine Orb reads 376 off tens of thousands of trades and 190 off a few dozen
 * listings, and the second number is simply wrong. The exchange has no per-form rows, so a
 * variant always prices off the listings.
 *
 * A selector with `corruption` reads that corruption outcome of the unique it names, not a
 * listing.
 *
 * A row with variants prices each variant and not itself, because a price attaches to a
 * variant. A row without prices itself, through its own selector when it has one. A
 * selector that matches no listing leaves the field absent rather than failing: a gem key on
 * a base is no price, not an error.
 */
export function fromPoeWatch(
  rows: readonly Item[],
  listings: readonly ItemData[],
  ratios: readonly ExchangeRatioItem[],
  corruptions: readonly ItemCorruptions[],
): readonly Item[] {
  const index = byName(listings);
  const outcomesById = new Map(corruptions.map((item) => [item.item_id, item.corruptions]));
  // A row with no trade in the window carries no price, and prices nothing here either.
  const exchange = new Map(
    ratios.flatMap((ratio) =>
      ratio.price === undefined
        ? []
        : [[ratio.name, { chaos: ratio.price.chaos, lowConfidence: ratio.price.lowConfidence }] as const],
    ),
  );

  return rows.map((item) => {
    // The listings are looked up under the selector's name when it has one — a cluster jewel
    // is listed under its enchant — and a variant inherits its row's.
    const rowName = queriesOf(item.listing)[0]?.name ?? item.name;
    const listed = (selector: ListingMatch | undefined): readonly ItemData[] =>
      index.get(listingKey(selector?.name ?? rowName)) ?? [];
    const priceOf = (query: ListingMatch | undefined): Price | undefined =>
      query?.corruption === undefined
        ? pick(listed(query), query)
        : pickOutcome(listed(query), query.corruption, outcomesById);
    // Several links price at the dearest.
    const choose = (listing: Listing | undefined): Price | undefined =>
      queriesOf(listing).reduce<Price | undefined>((best, query) => {
        const chosen = priceOf(query);
        if (chosen === undefined) return best;
        return best === undefined || chosen.mean > best.mean ? chosen : best;
      }, undefined);

    if (item.variants === undefined) {
      const sale = exchange.get(rowName);
      if (sale !== undefined) {
        return { ...item, meanPrice: sale.chaos, lowConfidence: sale.lowConfidence };
      }

      const chosen = choose(item.listing);
      return chosen === undefined
        ? item
        : { ...item, meanPrice: chosen.mean, lowConfidence: chosen.lowConfidence };
    }

    const variants: PricedVariant[] = item.variants.map((variant) => {
      const chosen = choose(variant.listing);
      return chosen === undefined
        ? variant
        : { ...variant, meanPrice: chosen.mean, lowConfidence: chosen.lowConfidence };
    });

    return { ...item, variants };
  });
}
