import type { PriceName } from "../../api/panel-api.ts";
import type { ValueOption } from "../types.ts";

/** Listing and exchange names as one sorted option per name, carrying every label it has. */
export function mergePriceNames(listings: readonly PriceName[], exchange: readonly PriceName[]): readonly ValueOption[] {
  const labels = new Map<string, string[]>();

  for (const { name, label } of [...listings, ...exchange]) {
    labels.set(name, [...(labels.get(name) ?? []), label]);
  }

  return [...labels]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([value, list]) => ({ value, label: list.join(" · ") }));
}
