/** Which game a request is about. PoeWatch serves both from one API. */
export type Game = "poe1" | "poe2";

/** One day's mean price, from the seven-day series on an exchange side. */
export type ExchangeRatioHistoryPoint = {
  /** The day the mean covers, as `YYYY-MM-DD`. */
  readonly date: string;
  /** Mean price on that day, in the side's currency. */
  readonly meanPrice: number;
};

/**
 * One side of an item's exchange market — its price against Chaos, or against Divine.
 *
 * The five always-present fields are the ones a side has even when nothing traded: an
 * untraded side comes back as zeroes rather than absent. Everything below them appears
 * only once the pair exists, which is why they are optional here.
 */
export type ExchangeRatioSide = {
  /** Mean price for the item in the side's currency. */
  readonly value: number;
  /** True if the price is based on few listings or has high variance. */
  readonly lowConfidence: boolean;
  /** Unix timestamp in seconds. 0 on a side that never traded. */
  readonly timestamp: number;
  /** Listing volume behind `value`. */
  readonly volume: number;
  /** Percentage change from yesterday. */
  readonly change24H: number;

  /** `value` restated in Chaos Orbs. */
  readonly chaosValue?: number;
  /** `value` restated in Divine Orbs. */
  readonly divineValue?: number;
  /**
   * Currency Exchange pair id, joining to `ExchangePair` on the compact rows in
   * `get-compact-data.types.ts`.
   */
  readonly pairID?: number;
  /** Listing volume over the last 24 hours. */
  readonly volume24H?: number;
  /** Mean price per day for the last seven days. Null when there is no series. */
  readonly history7D?: readonly ExchangeRatioHistoryPoint[] | null;
};

/**
 * One item's exchange ratios, both sides of it.
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
  /** The item's market against Chaos Orbs. */
  readonly chaos: ExchangeRatioSide;
  /** The item's market against Divine Orbs. */
  readonly divine: ExchangeRatioSide;
};

/** Envelope returned by `GET /exchange/ratios`. */
export type ExchangeRatiosResponse = { readonly items: readonly ExchangeRatioItem[] };
