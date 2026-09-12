import type { PoeWatchService } from "@poe/poe-watch/service";
import type { ItemData } from "@poe/poe-watch/get-compact-data.types";
import type { ListingMatch } from "../taxonomy/types.ts";
import { listingQuery } from "./listing-query.ts";

/** One form PoeWatch prices a name at: what tells it apart, and what it sells for. */
export type Form = {
  readonly query: ListingMatch;
  readonly frame: number;
  readonly itemLevel?: number;
  readonly linkCount?: number;
  readonly gemLevel?: number;
  readonly gemQuality?: number;
  readonly gemIsCorrupted?: boolean;
  readonly mapTier?: number;
  readonly influences: readonly string[];
  readonly synthesised: boolean;
  readonly mean: number;
  readonly daily: number;
  readonly lowConfidence: boolean;
};

const number = (value: number | null | undefined): number | undefined => (value === null ? undefined : value);

function toForm(listing: ItemData): Form {
  const query = listingQuery(listing);
  const itemLevel = number(listing.itemLevel);
  const linkCount = "linkCount" in listing ? number(listing.linkCount) : undefined;
  const mapTier = "mapTier" in listing ? number(listing.mapTier) : undefined;

  return {
    query,
    frame: listing.frame,
    ...(itemLevel === undefined ? {} : { itemLevel }),
    ...(linkCount === undefined ? {} : { linkCount }),
    ...(listing.category === "gem"
      ? { gemLevel: listing.gemLevel, gemQuality: listing.gemQuality, gemIsCorrupted: listing.gemIsCorrupted }
      : {}),
    ...(mapTier === undefined ? {} : { mapTier }),
    influences: listing.influences === "" ? [] : listing.influences.split(","),
    synthesised: query.synthesised === true,
    mean: listing.mean,
    daily: listing.daily,
    lowConfidence: listing.lowConfidence,
  };
}

/** Every form PoeWatch lists under one name. */
export async function getForms(poeWatch: PoeWatchService, league: string, name: string): Promise<readonly Form[]> {
  const listings = await poeWatch.getCompactData(league);

  return listings.filter((listing) => listing.name === name).map(toForm);
}
