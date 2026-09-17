import { place } from "./bucket-items/place.ts";
import { pricesOf } from "./bucket-items/prices-of.ts";
import type { Bucket, Bucketed, Placement, PricedRow, Prices, Unplaced } from "./bucket-items/types.ts";

const why = (prices: Prices, buckets: readonly Bucket[]): string => {
  if (prices.take === undefined && prices.check === undefined && prices.gamble === undefined) {
    return "nothing priced it";
  }

  const lowest = Math.min(...buckets.map((bucket) => bucket.floor));
  const best = Math.max(prices.take ?? 0, prices.check ?? 0, prices.gamble ?? 0);

  if (best < lowest) return `worth ${best}c at best, under the ${lowest}c floor of every bucket`;
  if (prices.gamble !== undefined && prices.gamble >= lowest) {
    return `only its ${prices.gamble}c corruption reaches a bucket, and no bucket there gambles`;
  }

  return `worth ${best}c at best, which falls in a gap between buckets`;
};

/**
 * One category's rows, sorted into buckets, each with the reason it landed where it did.
 *
 * Call it per category. A bucket list is one category's ladder — a category whose rungs are
 * stack sizes and one whose rungs are Chaos do not share a ladder, and nothing here tries to
 * make them.
 *
 * A row nothing places is returned rather than dropped, because "no bucket wanted it" is a
 * finding and not a failure.
 */
export function bucketItems(buckets: readonly Bucket[], rows: readonly PricedRow[]): Bucketed {
  if (buckets.length === 0) {
    throw new Error("bucketItems needs at least one bucket");
  }

  const placed: Placement[] = [];
  const unplaced: Unplaced[] = [];

  for (const row of rows) {
    const prices = pricesOf(row);
    const found = place(buckets, prices);
    const where = {
      key: row.key,
      name: row.name,
      category: row.category,
      subcategory: row.subcategory,
      prices,
    };

    if (found === undefined) {
      unplaced.push({ ...where, reason: why(prices, buckets) });
      continue;
    }

    placed.push({ ...where, bucket: found.bucket.name, verb: found.verb, reason: found.reason });
  }

  return { placed, unplaced };
}
