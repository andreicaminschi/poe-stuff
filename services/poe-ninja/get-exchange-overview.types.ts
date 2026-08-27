import type { SparkLine } from "./types.ts";

/**
 * One row of `GET /poe1/api/economy/exchange/current/overview` — the Currency Exchange.
 *
 * The row names nothing: `id` is a slug (`divine`, `accelerating-catalyst`) and the name
 * lives in the sibling `items` array. `primaryValue` is the price in the book's primary
 * currency, which is chaos for every PoE1 type in the sample.
 */
export type ExchangeLine = {
  readonly id: string;
  readonly primaryValue: number;
  readonly volumePrimaryValue: number;
  readonly maxVolumeCurrency: string;
  readonly maxVolumeRate: number;
  readonly sparkline?: SparkLine;
};

/** What an exchange slug is called, and which drawer poe.ninja files it in. */
export type ExchangeItemMeta = {
  readonly id: string;
  readonly name: string;
  readonly image?: string;
  readonly category?: string;
  readonly detailsId?: string;
};

/**
 * The book's own terms: which currency prices are quoted in, and the rate to the other
 * side. `rates` is keyed by slug — `{ divine: 0.004892 }` is a divine at 204.4 chaos.
 */
export type ExchangeCore = {
  readonly primary: string;
  readonly secondary: string;
  readonly rates: Readonly<Record<string, number>>;
  readonly items?: readonly ExchangeItemMeta[];
};

export type ExchangeOverviewResponse = {
  readonly core: ExchangeCore;
  readonly lines: readonly ExchangeLine[];
  readonly items: readonly ExchangeItemMeta[];
};

/** Every `type` the Currency Exchange overview answers for. */
export const EXCHANGE_TYPES = [
  "Currency",
  "Fragment",
  "Runegraft",
  "AllflameEmber",
  "Tattoo",
  "Omen",
  "DjinnCoin",
  "Ducat",
  "EnshroudingCrystal",
  "DivinationCard",
  "Artifact",
  "Oil",
  "DeliriumOrb",
  "Scarab",
  "Astrolabe",
  "Fossil",
  "Resonator",
  "Essence",
] as const;

export type ExchangeType = (typeof EXCHANGE_TYPES)[number];
