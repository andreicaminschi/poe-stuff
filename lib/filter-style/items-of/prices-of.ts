import type { Prices, UniqueListing } from "../types.ts";

export type Worth = {
  readonly price?: number;
  readonly list?: readonly UniqueListing[];
  /** The corruption outcomes on the same base, for an uncorrupted unique. */
  readonly outcomes?: readonly UniqueListing[];
  readonly unique: boolean;
  readonly corrupted: boolean;
};

const priceOf = (one: UniqueListing): number => one.meanPrice ?? 0;

function gambleOf(outcomes: readonly UniqueListing[] | undefined, take: number): Prices {
  if (outcomes === undefined) return {};

  const gamble = Math.max(...outcomes.map(priceOf));
  return gamble > take ? { gamble } : {};
}

function fromList(worth: Worth, list: readonly UniqueListing[]): Prices {
  const prices = list.map(priceOf);
  const take = Math.min(...prices);
  const check = Math.max(...prices);

  if (worth.corrupted) return { check };
  return { take, ...(check > take ? { check } : {}), ...gambleOf(worth.outcomes, take) };
}

/**
 * What an item is worth as it lies, what identifying it could be worth, and what corrupting
 * it could be worth.
 *
 * A corrupted unique is never a take: its worth rides on an implicit no condition reads.
 */
export function pricesOf(worth: Worth): Prices {
  if (worth.list !== undefined) return fromList(worth, worth.list);
  if (worth.price === undefined) return {};
  if (worth.unique && worth.corrupted) return { check: worth.price };

  return { take: worth.price };
}
