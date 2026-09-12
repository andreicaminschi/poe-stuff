import type { PriceName } from "../../api/panel-api.ts";
import type { PriceOption } from "../types.ts";
import { describeListing } from "./describe-listing.ts";

/** Listings and exchange names as one sorted option per listing, carrying every label it has. */
export function mergePriceNames(listings: readonly PriceName[], exchange: readonly PriceName[]): readonly PriceOption[] {
  const byValue = new Map<string, PriceOption>();

  for (const { label, listing } of [...listings, ...exchange]) {
    const value = describeListing(listing);
    const seen = byValue.get(value);
    byValue.set(value, { value, label: seen?.label === undefined ? label : `${seen.label} · ${label}`, listing });
  }

  return [...byValue.values()].sort((a, b) => a.value.localeCompare(b.value));
}
