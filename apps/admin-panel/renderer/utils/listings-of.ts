import type { Listing, ListingMatch } from "../../api/taxonomy/types.ts";

/** A row's links as a list, however they were written. */
export function listingsOf(listing: Listing | undefined): readonly ListingMatch[] {
  if (listing === undefined) return [];
  if (Array.isArray(listing)) return listing as readonly ListingMatch[];
  return [listing as ListingMatch];
}
