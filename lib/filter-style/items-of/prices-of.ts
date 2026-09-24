import type { Prices, UniqueListing } from "../types.ts";

export type Worth = {
  readonly price?: number;
  readonly list?: readonly UniqueListing[];
  readonly unique: boolean;
  readonly corrupted: boolean;
};

function fromList(list: readonly UniqueListing[], corrupted: boolean): Prices {
  const prices = list.map((one) => one.meanPrice ?? 0);
  const take = Math.min(...prices);
  const check = Math.max(...prices);

  if (corrupted) return { check };
  return check > take ? { take, check } : { take };
}

/**
 * What an item is worth as it lies, and what identifying it could be worth.
 *
 * A corrupted unique is never a take: its worth rides on an implicit no condition reads.
 */
export function pricesOf(worth: Worth): Prices {
  if (worth.list !== undefined) return fromList(worth.list, worth.corrupted);
  if (worth.price === undefined) return {};
  if (worth.unique && worth.corrupted) return { check: worth.price };

  return { take: worth.price };
}
