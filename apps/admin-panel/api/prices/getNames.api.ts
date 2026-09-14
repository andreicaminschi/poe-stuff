import type { PoeWatchService } from "@poe/poe-watch/service";
import type { CorruptionOutcome } from "@poe/poe-watch/types";
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

/** Every corruption outcome PoeWatch prices, once per unique and outcome, the most listed. */
export async function getCorruptionNames(poeWatch: PoeWatchService, league: string): Promise<readonly PriceName[]> {
  const [listings, corruptions] = await Promise.all([
    poeWatch.getCompactData(league),
    poeWatch.getCorruptionData(league),
  ]);
  const nameById = new Map(listings.map((listing) => [listing.id, listing.name]));
  const best = new Map<string, { readonly name: string; readonly outcome: CorruptionOutcome }>();

  for (const item of corruptions) {
    const name = nameById.get(item.item_id);
    if (name === undefined) continue;

    for (const outcome of item.corruptions) {
      const key = `${name}\n\n${outcome.name}`;
      const seen = best.get(key);
      if (seen === undefined || outcome.daily > seen.outcome.daily) best.set(key, { name, outcome });
    }
  }

  return [...best.values()].map(({ name, outcome }) => ({
    name: `${name} (${outcome.name})`,
    label: `corruption · ${Math.round(outcome.mean)}c · ${outcome.daily}/d${outcome.lowConfidence ? " · low" : ""}`,
    listing: { name, corruption: outcome.name },
  }));
}
