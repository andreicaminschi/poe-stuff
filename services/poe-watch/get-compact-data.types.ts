/**
 * Market data for one item in one league, as returned by PoeWatch.
 *
 * `category` is the discriminant: it decides which fields exist at all. Fields that do
 * not apply to a category are absent from the payload, not null — so they are optional
 * here rather than `| null`. Prices are in Chaos Orbs unless the name says otherwise.
 *
 * Shapes were derived from a full `/compact` dump: 33,134 rows across the 31 categories
 * below.
 */
export type ItemCategory =
  | "accessories"
  | "armour"
  | "azmeri"
  | "bases"
  | "card"
  | "catalysts"
  | "chayula"
  | "currency"
  | "deepwater"
  | "delirium"
  | "delve"
  | "divination"
  | "essence"
  | "flasks"
  | "fragment"
  | "gem"
  | "heist"
  | "heistmission"
  | "heistobjective"
  | "itemisedcorpses"
  | "jewels"
  | "legion"
  | "logbook"
  | "maps"
  | "monsters"
  | "oils"
  | "research"
  | "ritual"
  | "sanctum"
  | "scarab"
  | "weapons";

/** The fields every row carries, whatever its category. */
export type ItemCommon = {
  /** Unique identifier for the item. */
  readonly id: number;
  /** The name of the item. */
  readonly name: string;
  /** The specific group within the category, e.g. `helmets`, `skillgem`, `stackable`. */
  readonly group: string | null;
  /** Item frame type: 0=Normal, 1=Magic, 2=Rare, 3=Unique, 4=Gem, 5=Currency, 6=Divination Card. */
  readonly frame: number;
  /** Serialized influence information. Empty string if none. */
  readonly influences: string;
  /** URL to the item's icon on the Path of Exile CDN. */
  readonly icon: string;
  /** The average price of the item in Chaos Orbs. */
  readonly mean: number;
  /** The minimum observed price of the item in Chaos Orbs. */
  readonly min: number;
  /** The maximum observed price of the item in Chaos Orbs. */
  readonly max: number;
  /** The price of the item represented in Exalted Orbs (value relative to Chaos). */
  readonly exalted: number;
  /** The price of the item represented in Divine Orbs. */
  readonly divine: number;
  /** Number of listings observed within the last 24 hours. */
  readonly daily: number;
  /** Recent price change percentage. */
  readonly change: number | null;
  /** A small array of recent price points (e.g. last 7 days) in Chaos Orbs. */
  readonly history: readonly number[] | null;
  /** Seven-day history values. Individual entries may be null. */
  readonly sevenDaysHistory: readonly (number | null)[] | null;
  /** True if the price data is based on a small number of listings or has high variance. */
  readonly lowConfidence: boolean;
  /** List of implicit modifiers on the item. Null if none. */
  readonly implicits: readonly string[] | null;
  /** List of explicit modifiers on the item. Null if none or not applicable. */
  readonly explicits: readonly string[] | null;
  /** Item level. Only applicable for items where ilvl matters. */
  readonly itemLevel: number | null;
  /** Inventory width of the item. */
  readonly width: number;
  /** Inventory height of the item. */
  readonly height: number;

  /** Price-weighted change metric used by the `/hot` page. Absent from `/compact`. */
  readonly changeByPrice?: number | null;
  /** Item subtype. Only applicable for some item families. Absent from `/compact`. */
  readonly type?: string | null;
  /** Number of uses. Only applicable for watchstones. Absent from `/compact`. */
  readonly uses?: number | null;
};

/**
 * Currency Exchange pair ids, on the categories that trade there. Independently
 * optional: an orb has no pair against itself, so Chaos Orb carries only
 * `divine_pair_id` and Divine Orb only `chaos_pair_id`. Optional even on categories
 * where the dump shows them on every row — several of those hold a handful of items, so
 * completeness there is sample size.
 */
export type ExchangePair = {
  /** Exchange pair ID for the chaos market. */
  readonly chaos_pair_id?: number | null;
  /** Exchange pair ID for the divine market. */
  readonly divine_pair_id?: number | null;
};

/** Price of a max-rolled version, on the categories whose items roll modifiers. */
export type PerfectPrice = {
  /** Estimated price for a "perfect" version of the item, in Chaos Orbs. 0 if not applicable. */
  readonly perfectPrice?: number;
  /** Number of listings considered for the perfect price calculation. */
  readonly perfectAmount?: number;
};

/** Item bases — white bases listed by ilvl and influence. */
export type BaseTypeItem = ItemCommon & {
  readonly category: "bases";
  /** Number of linked sockets, 0 for non-linkable items. Absent on bases that cannot link. */
  readonly linkCount?: number;
  /**
   * How many passives a cluster jewel allocates, as PoeWatch buckets it. A string, because
   * one bucket is a range: small `2`, `3`; medium `4`, `5`, `6`; large `8`, `9-11`, `12`.
   * Only cluster jewels carry it, and their enchant is in the `name`.
   */
  readonly passives?: string;
};

/** Skill and support gems. The only category carrying the gem fields. */
export type GemItem = ItemCommon & {
  readonly category: "gem";
  /** The level of the gem. */
  readonly gemLevel: number;
  /** The quality of the gem. */
  readonly gemQuality: number;
  /** Indicates if the gem is corrupted. */
  readonly gemIsCorrupted: boolean;
};

/** Unique and rare armour pieces. */
export type ArmourItem = ItemCommon &
  PerfectPrice & {
    readonly category: "armour";
    /** Number of linked sockets, 0 for non-linkable items. */
    readonly linkCount: number;
  };

/** Unique weapons. */
export type WeaponItem = ItemCommon &
  PerfectPrice & {
    readonly category: "weapons";
    /** Number of linked sockets, 0 for non-linkable items. */
    readonly linkCount: number;
  };

/** Unique jewels, including abyss and cluster jewels. No sockets, so no `linkCount`. */
export type JewelItem = ItemCommon & PerfectPrice & { readonly category: "jewels" };

/** Unique rings, amulets and belts. */
export type AccessoryItem = ItemCommon &
  PerfectPrice & {
    readonly category: "accessories";
    /** Number of linked sockets, 0 for non-linkable items. */
    readonly linkCount: number;
  };

/** Maps of every rarity, plus the unique maps. */
export type MapItem = ItemCommon &
  ExchangePair & {
    readonly category: "maps";
    /** Tier of the map. Absent on rows where tier does not apply. */
    readonly mapTier?: number | null;
    /** Map series identifier (e.g. Atlas Invasion, Conquerors). Absent from `/compact`. */
    readonly mapSeries?: number | null;
  };

/** Currency orbs and shards. */
export type CurrencyItem = ItemCommon & ExchangePair & { readonly category: "currency" };

/** Itemised beasts from the menagerie. Every row is group `beast`. */
export type MonsterItem = ItemCommon & { readonly category: "monsters" };

/** Itemised corpses from Necropolis. */
export type ItemisedCorpseItem = ItemCommon & { readonly category: "itemisedcorpses" };

/** Scarabs. */
export type ScarabItem = ItemCommon & ExchangePair & { readonly category: "scarab" };

/** Divination cards. Frame 6, and the only category with reward fields. */
export type DivinationCardItem = ItemCommon &
  ExchangePair & {
    readonly category: "card";
    /** Reward name for the card. */
    readonly reward?: string | null;
    /** Item ID of the reward. */
    readonly reward_id?: number | null;
    /** Reward price for the card. */
    readonly reward_price?: number | null;
  };

/** Heist contracts and blueprints. */
export type HeistMissionItem = ItemCommon & {
  readonly category: "heistmission";
  /** Revealed wings state for heist blueprints. Absent from `/compact`. */
  readonly wingsRevealed?: string | null;
};

/** Essences. The only category carrying `tier`. */
export type EssenceItem = ItemCommon &
  ExchangePair & {
    readonly category: "essence";
    /** Tier of the essence. */
    readonly tier: number;
  };

/** Deepwater league items. */
export type DeepwaterItem = ItemCommon & ExchangePair & { readonly category: "deepwater" };

/** Unique flasks and tinctures. */
export type FlaskItem = ItemCommon & { readonly category: "flasks" };

/** Map fragments, sets and invitations. */
export type FragmentItem = ItemCommon & ExchangePair & { readonly category: "fragment" };

/** Heist currency: markers and replacement gear currency. */
export type HeistItem = ItemCommon & ExchangePair & { readonly category: "heist" };

/** Delve fossils and resonators. */
export type DelveItem = ItemCommon & ExchangePair & { readonly category: "delve" };

/** Sanctum relics. */
export type SanctumItem = ItemCommon & { readonly category: "sanctum" };

/** Blight oils. */
export type OilItem = ItemCommon & ExchangePair & { readonly category: "oils" };

/** Azmeri (Affliction) league items. */
export type AzmeriItem = ItemCommon & { readonly category: "azmeri" };

/** Legion incubators and splinters. */
export type LegionItem = ItemCommon & ExchangePair & { readonly category: "legion" };

/** Catalysts. */
export type CatalystItem = ItemCommon & ExchangePair & { readonly category: "catalysts" };

/** Expedition logbooks. */
export type LogbookItem = ItemCommon & { readonly category: "logbook" };

/** Chayula and breachstone-adjacent items. */
export type ChayulaItem = ItemCommon & { readonly category: "chayula" };

/** Betrayal research bench items. */
export type ResearchItem = ItemCommon & { readonly category: "research" };

/** Delirium orbs and simulacrum splinters. */
export type DeliriumItem = ItemCommon & ExchangePair & { readonly category: "delirium" };

/** Ritual vessels. */
export type RitualItem = ItemCommon & ExchangePair & { readonly category: "ritual" };

/** Heist objective items — the targets a contract is run for. */
export type HeistObjectiveItem = ItemCommon & { readonly category: "heistobjective" };

/**
 * Stacked Deck. Its own category despite being currency — PoeWatch files the deck apart
 * from the cards it opens into, which live in {@link DivinationCardItem}.
 */
export type StackedDeckItem = ItemCommon &
  ExchangePair & { readonly category: "divination" };

/** One item's market data. Narrow on `category` to reach the per-category fields. */
export type ItemData =
  | AccessoryItem
  | ArmourItem
  | AzmeriItem
  | BaseTypeItem
  | CatalystItem
  | ChayulaItem
  | CurrencyItem
  | DeepwaterItem
  | DeliriumItem
  | DelveItem
  | DivinationCardItem
  | EssenceItem
  | FlaskItem
  | FragmentItem
  | GemItem
  | HeistItem
  | HeistMissionItem
  | HeistObjectiveItem
  | ItemisedCorpseItem
  | JewelItem
  | LegionItem
  | LogbookItem
  | MapItem
  | MonsterItem
  | OilItem
  | ResearchItem
  | RitualItem
  | SanctumItem
  | ScarabItem
  | StackedDeckItem
  | WeaponItem;

/** Envelope returned by `GET /compact`. */
export type CompactResponse = { readonly items: readonly ItemData[] };
