/**
 * What one corrupted outcome of an item sells for. Every field is always present and
 * never null — this endpoint has none of `/compact`'s per-category variation.
 */
export type CorruptionOutcome = {
  /**
   * The implicit the corruption rolled, with numeric rolls left as `#`. Two-line mods
   * are one string joined by a literal backslash-n, not a newline — 969 of the 32,589
   * entries in the sample look like `#% chance to cause Bleeding on Hit\\n#% increased
   * Attack Damage against Bleeding Enemies`.
   */
  readonly name: string;
  /** The average price of the item with this outcome, in Chaos Orbs. */
  readonly mean: number;
  /** Number of listings observed within the last 24 hours. Can be 0. */
  readonly daily: number;
  /** True if the price is based on a small number of listings or has high variance. */
  readonly lowConfidence: boolean;
};

/**
 * Every priced corruption outcome for one item.
 *
 * `item_id` joins to `ItemData.id` in `get-compact-data.types.ts`, though not every id
 * resolves: the two
 * endpoints are separate snapshots, and 6 of the sample's 1,989 ids were absent from the
 * compact dump taken alongside it. Only four categories appear at all — `armour`,
 * `weapons`, `accessories` and `jewels`.
 */
export type ItemCorruptions = {
  readonly item_id: number;
  readonly corruptions: readonly CorruptionOutcome[];
};
