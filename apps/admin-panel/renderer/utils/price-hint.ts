import type { Item } from "../../api/taxonomy/types.ts";

export type PriceHint = { readonly placeholder: string; readonly note: string };

export function priceHint(item: Pick<Item, "quest">, hasVariants: boolean): PriceHint {
  if (item.quest === true) {
    return {
      placeholder: "Not needed: a quest item",
      note: "Not required. A quest item is published without a listing.",
    };
  }

  if (hasVariants) {
    return {
      placeholder: "Not used: the variants are priced",
      note: "Not required. This row has variants, so each variant's listing is read and this one is ignored.",
    };
  }

  return {
    placeholder: "Required: pick a PoeWatch listing",
    note: "Required. The exact listing this row prices off; without one the row is not published.",
  };
}
