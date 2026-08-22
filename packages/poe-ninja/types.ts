/**
 * poe.ninja's economy API, and the rows this package hands back.
 *
 * Two vocabularies live here and they are deliberately kept apart:
 *
 * - **The wire types** — `ItemOverviewLine`, `ExchangeOverviewResponse` and friends — are
 *   poe.ninja's own shapes, named the way poe.ninja names them. Optional means the field
 *   is absent from the payload rather than null: a level 1 gem arrives with no
 *   `gemQuality` key at all, and a `Vaal Regalia` base with no `variant` is uninfluenced.
 * - **The output types** — `NinjaItem` and `NinjaExchangeItem` — are what the filter's
 *   classifier reads a market through. Same field names, same units, same meanings.
 *
 * Shapes were derived from a full download of all 28 item types and the exchange for one
 * league: 33,200 item lines, and every field named below was seen on at least one of them.
 */

/** A seven-day price series. `data` carries nulls for days with no sample. */
export type SparkLine = {
  readonly totalChange: number;
  readonly data: readonly (number | null)[];
};

/** One modifier line on an item, as poe.ninja renders it. */
export type ModifierLine = {
  readonly text: string;
  readonly optional: boolean;
};

/**
 * One row of `GET /poe1/api/economy/stash/current/item/overview`.
 *
 * Everything except `id`, `name`, `chaosValue`, `count` and `listingCount` is optional,
 * because the endpoint answers for 28 different kinds of item through one shape and each
 * kind omits what does not apply to it.
 *
 * **`itemClass` is in here and is read nowhere.** It is not the rarity the docs describe:
 * `type=BaseType` returns 20,004 white crafting bases of which ~95% carry `2`, and
 * `type=UniqueAccessory` carries `3` on 357 rows and `10` on eight ordinary uniques —
 * Nimis, Stranglegasp, Precursor's Emblem. What an item is comes from the `type` that was
 * asked for. See `item-types.ts`.
 */
export type ItemOverviewLine = {
  readonly id: number;
  readonly name: string;
  readonly icon?: string;
  /**
   * The game item this row is a variation of. Present where the row's `name` is not the
   * item — a Scrying Orb's `name` is the atlas region, a cluster jewel's is the enchant,
   * a Vaal transfiguration's is the plain Vaal gem. See `NAMING` in `item-types.ts`.
   */
  readonly baseType?: string;
  /** The equipment slot or item family, e.g. `Body Armour`, `Belt`, `Life Flask`. */
  readonly itemType?: string;
  /**
   * The roll this row was priced at. What it holds depends on the type: an influence on a
   * base (`Shaper`, `Elder/Crusader`), a unique's mod set (`Culling Strike, Soul Eater`),
   * a gem's level/quality (`21/23c`), a map series (`Atlas`).
   */
  readonly variant?: string;
  /**
   * poe.ninja's rarity number. Not trustworthy — see the type doc above.
   */
  readonly itemClass?: number;
  readonly detailsId?: string;
  /**
   * **Item level on `BaseType`, `Flask` and `ClusterJewel`; the item's level requirement
   * on everything else.** The same key, two meanings, decided by the type that was asked
   * for — which is why only `ILVL_TYPES` reads it as an item level.
   */
  readonly levelRequired?: number;
  readonly chaosValue: number;
  readonly divineValue?: number;
  readonly exaltedValue?: number;
  /** Listings behind the printed price. Saturates at 399. */
  readonly count: number;
  /** Listings seen over the league. Cumulative, and no evidence of a current market. */
  readonly listingCount: number;
  readonly sparkLine?: SparkLine;
  readonly implicitModifiers?: readonly ModifierLine[];
  readonly explicitModifiers?: readonly ModifierLine[];
  readonly mutatedModifiers?: readonly ModifierLine[];
  readonly flavourText?: string;
  /** Linked sockets, as a string. `""` where the item does not link. */
  readonly links?: number | string;
  readonly gemLevel?: number;
  /** **Absent when the quality is zero**, which is every gem as it drops. */
  readonly gemQuality?: number;
  readonly corrupted?: boolean;
  readonly stackSize?: number;
  readonly metadata?: unknown;
  readonly tradeInfo?: unknown;
  readonly tradeFilter?: unknown;
  /** Documented, and absent from every PoE1 row in the sample. */
  readonly mapTier?: number;
  readonly mapRegion?: string;
  readonly artFilename?: string;
};

/** Envelope returned by the item overview. `lines` is empty for a type nothing traded. */
export type ItemOverviewResponse = { readonly lines: readonly ItemOverviewLine[] };

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

/** One league, from `GET /poe1/api/economy/leagues`. `id` is what a query wants. */
export type EconomyLeague = { readonly id: string; readonly name: string };

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

/**
 * One item's market data, in the shape a filter reads a market through.
 *
 * **Every field is either poe.ninja's or documented as synthesized.** poe.ninja publishes
 * less than the shape wants, and the missing ones are filled with the empty value rather
 * than a guess:
 *
 * | Field | Where it comes from |
 * | --- | --- |
 * | `frame`, `category`, `group` | the `type` that was asked for — never `itemClass` |
 * | `mean`, `min`, `max` | `chaosValue`, all three: no spread is published |
 * | `daily` | `count`, the listings behind the price |
 * | `lowConfidence` | `count < 10`; there is no confidence flag |
 * | `itemLevel` | `levelRequired`, on the three base-like types only |
 * | `influences` | `variant`, on `BaseType` only |
 * | `width`, `height` | `1` — **not published at all** |
 * | `mapTier` | `null` — not published; the name carries the tier |
 * | `change`, `history` | `sparkLine` |
 *
 * `width`/`height` is the one place this says something false rather than nothing. It is
 * a footprint, nothing prices from it, and there is no second source for it.
 */
export type NinjaItem = {
  readonly id: number;
  readonly name: string;
  readonly group: string | null;
  /** 0 normal, 1 magic, 2 rare, 3 unique, 4 gem, 5 currency, 6 divination card. */
  readonly frame: number;
  /** Serialized influence, `""` where none. Only base rows ever carry one. */
  readonly influences: string;
  readonly icon: string;
  readonly mean: number;
  readonly min: number;
  readonly max: number;
  readonly exalted: number;
  readonly divine: number;
  /** Listings behind the price. See the table above — this is `count`. */
  readonly daily: number;
  readonly change: number | null;
  readonly history: readonly number[] | null;
  readonly sevenDaysHistory: readonly (number | null)[] | null;
  readonly lowConfidence: boolean;
  readonly implicits: readonly string[] | null;
  readonly explicits: readonly string[] | null;
  readonly itemLevel: number | null;
  readonly width: number;
  readonly height: number;
  /** poe.ninja's category word for this row, in PoeWatch's vocabulary. */
  readonly category: string;

  /** Linked sockets. Present on the two unique types that publish them. */
  readonly linkCount?: number;
  /** Gem level. Present on gem rows only. */
  readonly gemLevel?: number;
  /** Gem quality. **Zero, not absent**, on a gem that arrives without the key. */
  readonly gemQuality?: number;
  readonly gemIsCorrupted?: boolean;
  /** Always `null`: poe.ninja publishes no map tier. The name carries it. */
  readonly mapTier?: number | null;
  /** The type this row was fetched under, kept so a caller can tell where it came from. */
  readonly ninjaType: ItemType;
};

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
