import type { PoeWatchService } from "@poe/poe-watch/service";

/** One name PoeWatch lists under, and what it is there: its category, or the exchange. */
export type PriceName = { readonly name: string; readonly label: string };

/** Every name PoeWatch lists an item under, once each, with its category and form count. */
export async function getListingNames(poeWatch: PoeWatchService, league: string): Promise<readonly PriceName[]> {
  const byName = new Map<string, { readonly category: string; readonly forms: number }>();

  for (const listing of await poeWatch.getCompactData(league)) {
    const seen = byName.get(listing.name);
    byName.set(listing.name, { category: seen?.category ?? listing.category, forms: (seen?.forms ?? 0) + 1 });
  }

  return [...byName].map(([name, { category, forms }]) => ({
    name,
    label: forms === 1 ? category : `${category} · ${forms} forms`,
  }));
}

/** Every name the Currency Exchange trades, once each. */
export async function getExchangeNames(poeWatch: PoeWatchService, league: string): Promise<readonly PriceName[]> {
  const ratios = await poeWatch.getExchangeRatios(league, "poe1");

  return [...new Set(ratios.map((ratio) => ratio.name))].map((name) => ({ name, label: "exchange" }));
}
