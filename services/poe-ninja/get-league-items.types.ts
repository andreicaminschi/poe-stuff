import type { ItemType } from "./get-item-overview.types.ts";

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
