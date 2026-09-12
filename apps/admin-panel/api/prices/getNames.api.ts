import type { PoeWatchService } from "@poe/poe-watch/service";
import type { ListingMatch } from "../taxonomy/types.ts";
import { listingQuery } from "./listing-query.ts";

/** One listing a row can price off: the query that finds it, and what it is there. */
export type PriceName = { readonly name: string; readonly label: string; readonly listing: ListingMatch };

/** Every PoeWatch listing, one each, with its category, price and volume. */
export async function getListingNames(poeWatch: PoeWatchService, league: string): Promise<readonly PriceName[]> {
  const listings = await poeWatch.getCompactData(league);

  return listings.map((listing) => ({
    name: listing.name,
    label: `${listing.category} · ${Math.round(listing.mean)}c · ${listing.daily}/d`,
    listing: listingQuery(listing),
  }));
}

/** Every name the Currency Exchange trades, once each. */
export async function getExchangeNames(poeWatch: PoeWatchService, league: string): Promise<readonly PriceName[]> {
  const ratios = await poeWatch.getExchangeRatios(league, "poe1");

  return [...new Set(ratios.map((ratio) => ratio.name))].map((name) => ({ name, label: "exchange", listing: { name } }));
}
