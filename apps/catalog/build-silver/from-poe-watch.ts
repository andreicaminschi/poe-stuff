import type { ItemData } from "@poe/poe-watch/get-compact-data.types";
import type { ExchangeRatioItem } from "@poe/poe-watch/get-exchange-ratios.types";
import type { PriceSelector } from "@poe/taxonomy/get-taxonomy.types";
import { isFilterable } from "../item.ts";
import type { Item, PricedVariant } from "../item.ts";

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
const matches = (listing: ItemData, selector: PriceSelector): boolean =>
  Object.entries(selector).every(
    ([key, value]) =>
      (listing as unknown as Readonly<Record<string, unknown>>)[key] === value,
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
  selector: PriceSelector | undefined,
): ItemData | undefined {
  const kept =
    selector === undefined
      ? listings
      : listings.filter((listing) => matches(listing, selector));

  return kept.reduce<ItemData | undefined>(
    (best, listing) =>
      best === undefined ||
      listing.daily > best.daily ||
      (listing.daily === best.daily && listing.mean > best.mean)
        ? listing
        : best,
    undefined,
  );
}

/**
 * Attaches PoeWatch's mean to every filterable row.
 *
 * Joined on the display name, the only thing the two share — PoeWatch carries no metadata
 * id. A name two ids share prices both, the way `tradable` already marks both.
 *
 * **The exchange first, listings second.** A row the Currency Exchange trades takes the
 * exchange's price: a volume-weighted mean of actual trades, where compact is what people
 * asked for. A Divine Orb reads 376 off tens of thousands of trades and 190 off a few dozen
 * listings, and the second number is simply wrong. The exchange has no per-form rows, so a
 * variant always prices off the listings.
 *
 * A row with variants prices each variant and not itself, because a price attaches to a
 * variant. A row without prices itself, through its own selector when it has one. A
 * selector that matches no listing leaves the field absent rather than failing: a gem key on
 * a base is no price, not an error.
 *
 * Runs after everything that decides whether a row is filterable, and prices nothing else,
 * so the field being there means the generator can use it.
 */
export function fromPoeWatch(
  rows: readonly Item[],
  listings: readonly ItemData[],
  ratios: readonly ExchangeRatioItem[],
): readonly Item[] {
  const index = byName(listings);
  // A row with no trade in the window carries no price, and prices nothing here either.
  const exchange = new Map(
    ratios.flatMap((ratio) =>
      ratio.price === undefined
        ? []
        : [[ratio.name, { chaos: ratio.price.chaos, lowConfidence: ratio.price.lowConfidence }] as const],
    ),
  );

  return rows.map((item) => {
    if (item.name === null || !isFilterable(item)) return item;

    // The listings are looked up under the selector's name when it has one — a cluster jewel
    // is listed under its enchant — and a variant inherits its row's.
    const listed = (selector: PriceSelector | undefined): readonly ItemData[] =>
      index.get(
        listingKey(selector?.name ?? item.price?.name ?? item.name ?? ""),
      ) ?? [];

    if (item.variants === undefined) {
      const sale = exchange.get(item.price?.name ?? item.name);
      if (sale !== undefined) {
        return { ...item, meanPrice: sale.chaos, lowConfidence: sale.lowConfidence };
      }

      const chosen = pick(listed(item.price), item.price);
      return chosen === undefined
        ? item
        : { ...item, meanPrice: chosen.mean, lowConfidence: chosen.lowConfidence };
    }

    const variants: PricedVariant[] = item.variants.map((variant) => {
      const chosen = pick(listed(variant.price), variant.price);
      return chosen === undefined
        ? variant
        : { ...variant, meanPrice: chosen.mean, lowConfidence: chosen.lowConfidence };
    });

    return { ...item, variants };
  });
}
