import type { Bucket, Prices, Verb } from "./types.ts";

export type Placed = {
  readonly bucket: Bucket;
  readonly verb: Verb;
  readonly reason: string;
};

const holds = (bucket: Bucket, price: number): boolean =>
  price >= bucket.floor && (bucket.ceiling === undefined || price < bucket.ceiling);

const span = (bucket: Bucket): string =>
  bucket.ceiling === undefined ? `${bucket.floor}c and up` : `${bucket.floor}-${bucket.ceiling}c`;

/**
 * The bucket an item lands in, and why.
 *
 * Buckets are tried from the richest down, so an item reaches the highest tier any of its
 * three numbers earns. Inside one bucket the surest verb wins: what it is worth as it lies,
 * then what a form of it could be worth, then what corrupting it could be worth.
 *
 * **A bucket that refuses gambling never reads the corruption price.** That is the rule that
 * sends a cheap base with a spectacular corruption outcome to the tier its aspirational
 * price earns instead of the one its corruption would.
 */
export function place(buckets: readonly Bucket[], prices: Prices): Placed | undefined {
  const richestFirst = [...buckets].sort((a, b) => b.floor - a.floor);

  for (const bucket of richestFirst) {
    const { take, check, gamble } = prices;

    if (take !== undefined && holds(bucket, take)) {
      return { bucket, verb: "take", reason: `worth ${take}c as it lies, inside ${span(bucket)}` };
    }

    if (check !== undefined && holds(bucket, check)) {
      return {
        bucket,
        verb: "check",
        reason: `worth ${take === undefined ? "nothing" : `${take}c`} at its cheapest, but a form of it reaches ${check}c`,
      };
    }

    if (bucket.gamble && gamble !== undefined && holds(bucket, gamble)) {
      return {
        bucket,
        verb: "gamble",
        reason: `worth ${take === undefined ? "nothing" : `${take}c`} as it lies, and a corruption reaches ${gamble}c`,
      };
    }
  }

  return undefined;
}
