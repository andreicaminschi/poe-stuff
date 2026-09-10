import type { NinjaExchangeSide } from "./types.ts";

/**
 * One item's Currency Exchange price, in the shape a filter reads the exchange through.
 *
 * Only the chaos side exists. poe.ninja's book is quoted in one currency and publishes
 * the divine rate once, in `core.rates`, rather than a divine price per item — so the
 * `divine` side here is the same price restated, and never a second market.
 */
export type NinjaExchangeItem = {
  /**
   * A stable negative number hashed from the slug.
   *
   * Negative because the item overview's ids are poe.ninja's own positive ones and the
   * two feeds do not share a namespace — an exchange row and an item row that collided on
   * an id would be read as one item. Stable because the same slug must key the same row
   * on every run and in every process.
   */
  readonly id: number;
  readonly name: string;
  readonly icon: string;
  readonly category: string;
  readonly chaos: NinjaExchangeSide;
  readonly divine: NinjaExchangeSide;
};
