import type { Item } from "../../api/taxonomy/types.ts";
import { listingsOf } from "./listings-of.ts";

const unlisted = (row: Pick<Item, "listing">): boolean => listingsOf(row.listing).length === 0;

/** Every variant, and every item without variants, that has no "Listed as". Excluded and quest items need none. */
export function missingListings(items: readonly Item[]): readonly string[] {
  return items
    .filter((item) => item.excluded !== true && item.quest !== true)
    .flatMap((item) => [
      ...(unlisted(item) && item.variants.length === 0 ? [item.name] : []),
      ...item.variants.filter(unlisted).map((variant) => `${item.name} / ${variant.name}`),
    ]);
}
