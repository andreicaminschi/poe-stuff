import type { ItemOverviewLine } from "./get-item-overview.types.ts";

/**
 * What more than one endpoint in this package needs.
 *
 * Two vocabularies live in the `*.types.ts` files beside each endpoint, and they are
 * deliberately kept apart:
 *
 * - **The wire types** — `ItemOverviewLine`, `ExchangeOverviewResponse` and friends — are
 *   poe.ninja's own shapes, named the way poe.ninja names them. Optional means the field
 *   is absent from the payload rather than null: a level 1 gem arrives with no
 *   `gemQuality` key at all, and a `Vaal Regalia` base with no `variant` is uninfluenced.
 * - **The output types** — `NinjaItem` and `NinjaExchangeItem` — are what the filter's
 *   classifier reads a market through. Same field names, same units, same meanings.
 *
 * Shapes were derived from a full download of all 28 item types and the exchange for one
 * league: 33,200 item lines, and every field in them was seen on at least one.
 */

/** A seven-day price series. `data` carries nulls for days with no sample. */
export type SparkLine = {
  readonly totalChange: number;
  readonly data: readonly (number | null)[];
};

/** A response worth keeping, in the only form that survives being written down. */
export type CachedResponse = {
  url: string;
  status: number;
  body: unknown;
  storedAt: string;
};

/**
 * Somewhere previous answers live. `call` holds one of these as an interface it was handed,
 * so it stays ignorant of files, buckets and clients.
 *
 * Structurally identical to the ones `@poe/ggg` and `@poe/poe-watch` declare, on purpose
 * rather than by accident: one `fileCache<CachedResponse>(root)` from
 * `@util/cache/file-cache` satisfies every service in the repo, and no service has to import
 * another to say so.
 */
export type ResponseCache = {
  get(key: string): Promise<CachedResponse | undefined>;
  set(key: string, value: CachedResponse): Promise<void>;
};

/**
 * What every endpoint in this package needs from the process it runs in.
 *
 * The URL and the user agent are here rather than read from the environment, because a
 * service is configured by whoever builds it. Nothing in this package reads `process.env`,
 * so it runs with no `.env` at all.
 */
export type PoeNinjaContext = {
  /** Base of the poe.ninja API, without a trailing slash. */
  baseUrl: string;
  /** Sent on every request. */
  userAgent: string;
  /**
   * Absent by default. Its presence is the only thing that turns caching on — and a whole
   * market is 46 requests, so a laptop wants it.
   */
  cache?: ResponseCache;
};

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

/** One side of an exchange row. `chaosValue` is what a price is read off. */
export type NinjaExchangeSide = {
  readonly value: number;
  readonly lowConfidence: boolean;
  readonly timestamp: number;
  readonly volume: number;
  readonly change24H: number;
  readonly chaosValue?: number;
  readonly divineValue?: number;
};

/** One modifier line on an item, as poe.ninja renders it. */
export type ModifierLine = {
  readonly text: string;
  readonly optional: boolean;
};

/** Envelope returned by the item overview. `lines` is empty for a type nothing traded. */
export type ItemOverviewResponse = { readonly lines: readonly ItemOverviewLine[] };

/**
 * Every item `type` the PoE1 item overview answers for.
 *
 * Four of them — `Incubator`, `ShrineBelt`, `ImbuedGem`, `Memory` — answer with an empty
 * `lines` array in the league this was built against. That is an answer, not a failure:
 * nothing in the league traded one.
 *
 * `as const` rather than an enum, which `erasableSyntaxOnly` forbids.
 */
export const ITEM_TYPES = [
  "Wombgift",
  "Corpse",
  "Incubator",
  "UniqueWeapon",
  "UniqueArmour",
  "UniqueAccessory",
  "UniqueFlask",
  "UniqueJewel",
  "ForbiddenJewel",
  "ShrineBelt",
  "UniqueTincture",
  "UniqueRelic",
  "SkillGem",
  "ImbuedGem",
  "ClusterJewel",
  "Map",
  "BlightedMap",
  "BlightRavagedMap",
  "UniqueMap",
  "ValdoMap",
  "Invitation",
  "Memory",
  "IncursionTemple",
  "ScryingOrb",
  "BaseType",
  "Flask",
  "Beast",
  "Vial",
] as const;

export type ItemType = (typeof ITEM_TYPES)[number];
