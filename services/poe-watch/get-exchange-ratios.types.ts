import type { ExchangeRatioPrice, ExchangeRatioSide } from "./types.ts";

/**
 * One item's exchange ratios, both sides of it, and the price PoeWatch settles on.
 *
 * `id` joins to `ItemData.id` in `get-compact-data.types.ts`. `category` is the same
 * vocabulary as `ItemCategory` there but arrives as a plain string here — the endpoint
 * publishes no enum, so nothing narrows it.
 */
export type ExchangeRatioItem = {
  readonly id: number;
  readonly name: string;
  /** URL to the item's icon on the Path of Exile CDN. */
  readonly icon: string;
  readonly category: string;
  /**
   * The canonical price. Read this before either side.
   *
   * Absent on a row with no trade inside the window — two of 1,035 in a sample, each with a
   * side that last traded days ago. A row without one has no price worth reading.
   */
  readonly price?: ExchangeRatioPrice;
  /** The item's market against Chaos Orbs. */
  readonly chaos: ExchangeRatioSide;
  /** The item's market against Divine Orbs. */
  readonly divine: ExchangeRatioSide;
};
