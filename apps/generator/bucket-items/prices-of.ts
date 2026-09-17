import type { PricedRow, Prices } from "./types.ts";

const lowest = (values: readonly number[]): number | undefined =>
  values.length === 0 ? undefined : Math.min(...values);

const highest = (values: readonly number[]): number | undefined =>
  values.length === 0 ? undefined : Math.max(...values);

const isNumber = (value: number | undefined): value is number => value !== undefined;

const asksForCorrupted = (conditions: readonly { condition: string; value?: unknown }[]): boolean =>
  conditions.some((one) => one.condition === "Corrupted" && one.value === true);

/**
 * The three numbers a row is worth: as it lies, at its best, and corrupted.
 *
 * All three come off the row's own forms and nothing else. **A unique hanging off a base is
 * not the base** — it is its own row, in its own category, told apart on the ground by
 * `Rarity`, so a base is never worth what a unique that drops on it is worth.
 *
 * A form asking for `Corrupted True` is the gambled one, because that is the form you only
 * get by corrupting. Everything else is what the item is as it lies.
 *
 * **A form PoeWatch flagged `lowConfidence` is not read.** Those prices stand on a handful of
 * listings and reach absurd numbers — a corruption outcome at 2.5e13 Chaos is not a price,
 * and one of them would carry a whole bucket on its own.
 */
export function pricesOf(row: PricedRow): Prices {
  const variants = (row.variants ?? []).filter((one) => one.lowConfidence !== true);
  const forms =
    (row.variants ?? []).length === 0
      ? [{ price: row.lowConfidence === true ? undefined : row.meanPrice, corrupted: false }]
      : variants.map((one) => ({ price: one.meanPrice, corrupted: asksForCorrupted(one.conditions ?? []) }));

  const plain = forms.filter((one) => !one.corrupted).map((one) => one.price).filter(isNumber);
  const corrupted = forms.filter((one) => one.corrupted).map((one) => one.price).filter(isNumber);

  const take = lowest(plain);
  const check = highest(plain);
  const gamble = highest(corrupted);

  return {
    ...(take === undefined ? {} : { take }),
    ...(check === undefined ? {} : { check }),
    ...(gamble === undefined ? {} : { gamble }),
  };
}
