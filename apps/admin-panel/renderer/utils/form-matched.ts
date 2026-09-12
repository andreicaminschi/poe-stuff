import type { Variant } from "../../api/taxonomy/types.ts";
import { listingsOf } from "./listings-of.ts";
import { sameListing } from "./same-listing.ts";

/** Whether an existing variant already links the listing a discovered one selects. */
export function formMatched(discovered: Variant, variants: readonly Variant[]): boolean {
  const wanted = listingsOf(discovered.listing);

  return variants.some((variant) =>
    listingsOf(variant.listing).some((query) => wanted.some((one) => sameListing(query, one))),
  );
}
