import type { ModifierLine, SparkLine } from "./types.ts";

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
