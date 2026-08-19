/**
 * What the classifier decides, and the shape it decides it from.
 *
 * A filter never matches an item, it matches a *bucket* — the set of items sharing the
 * static properties the game exposes at drop time. Every type here describes a bucket,
 * never a single drop.
 */

/**
 * What to do with the bucket. Drives colour and icon shape, not loudness.
 *
 * - `take` — already worth what it says. The default, and what you get when the floor
 *   and the ceiling agree.
 * - `check` — the filter cannot tell which item this is. Hovering is free, so the bar to
 *   show one is almost nothing.
 * - `gamble` — the corruption outcome is the only reason to touch it. The ground price
 *   is beside the point and will contradict the tier on hover.
 */
export type Verb = "take" | "check" | "gamble";

/**
 * How loud. Drives font size, sound, beam and minimap icon.
 *
 * `T5` is not "quieter than T4", it is a different promise: the smallest mark the game
 * can draw, for a bucket that must appear even though it is worth nothing. Something has
 * to sit between T4 and `hidden` for a category the player has asked to always see.
 */
export type Tier = "T0" | "T1" | "T2" | "T3" | "T4" | "T5" | "hidden";

/** Which rule built the bucket, and therefore what its id means. */
export type BucketFamily =
  | "bases"
  | "corruptible-uniques"
  | "div-cards"
  | "foulborn"
  | "gems"
  | "maps"
  | "misc"
  | "stackables"
  | "unique-maps"
  | "uniques-by-base";

/**
 * One unique, after GGG and the wiki have been merged.
 *
 * GGG is the source of record for `name` and `baseType` — it is what the game and the
 * trade site agree on. `restrictedDrop` exists in neither GGG's data nor PoeWatch's, so
 * it comes from the wiki alone, and defaults to `false` when the wiki has nothing to say.
 */
export type FilterUnique = {
  readonly name: string;
  readonly baseType: string;
  /** The wiki's item class, or `"unknown"` when only GGG knew about this unique. */
  readonly category: string;
  /** True only when the wiki says so. Absent, unmatched or unqueried all mean false. */
  readonly restrictedDrop: boolean;
};

/** One emitted bucket: everything the generator needs to write a block. */
export type Bucket = {
  /** Stable identity. Goes in the block's marker comment so a runtime editor can find it. */
  readonly id: string;
  readonly family: BucketFamily;
  readonly verb: Verb;
  readonly tier: Tier;
  /** Worst outcome in the bucket, in chaos. What the filter can already see. */
  readonly floor: number;
  /** Best outcome in the bucket, in chaos. What it could turn out to be. */
  readonly ceiling: number;
  /** `ceiling / floor`. Over `RATIO_THRESHOLD` the floor is lying, and the verb changes. */
  readonly ratio: number;
  /** Expected value of the action the verb names. What the tier is cut on. */
  readonly ev: number;
  /**
   * The vaal upside is the reason to care about this bucket, or part of it.
   *
   * A property rather than a competing bucket, because it is a lever: a player who does
   * not vaal switches it off, and the bucket drops to `tierWithoutVaal` without anything
   * being re-priced. A Moonstone Ring is visible for Anathema whatever this says, and
   * visible *and* marked vaalable when Valyrium is in play.
   */
  readonly vaalable: boolean;
  /** Best corrupted outcome across the bucket's members, in chaos. 0 when none is priced. */
  readonly vaalCeiling: number;
  /**
   * Plain price of the member `vaalCeiling` belongs to — what the orb would destroy.
   *
   * Often a different unique than the one setting `ceiling`: Moonstone Ring peaks plain at
   * Shavronne's Revelation and vaals best as Anathema. Both the ratio test and the loss
   * cap are about the item being vaaled, so both read this rather than `ceiling`.
   */
  readonly vaalFloor: number;
  /** `vaalCeiling × hit rate − the orb`. What the bucket is worth to someone who vaals. */
  readonly vaalEv: number;
  /** The tier this bucket falls to when the player switches gambling off. */
  readonly tierWithoutVaal: Tier;
  /**
   * Every price behind this bucket is low-confidence or barely traded. Never hides a
   * bucket on its own — showing a cheap item costs a click, hiding an expensive one
   * costs the item.
   */
  readonly thin: boolean;
  /** How many priced items sit in the bucket. */
  readonly members: number;
  /** Inventory footprint, `width × height`. 0 where the bucket spans several sizes. */
  readonly slots: number;
  /** A condition the block carries beyond its key, e.g. `ilvl>=84`. Empty when none. */
  readonly note: string;
  /**
   * The item this bucket was tiered on, and its price.
   *
   * A bucket is tiered at its best outcome, so one member decides the treatment for
   * everything sharing the block — and which one is not guessable from the id. Names the
   * corrupted outcome instead when the vaal side is what set the tier.
   */
  readonly setBy: string;
  /**
   * Whether the price in `setBy` came off the Currency Exchange rather than out of a
   * scraped listing. Worth saying out loud: those two are different claims about what an
   * item is worth, and only one of them is a book somebody traded against.
   */
  readonly fromExchange: boolean;
  /**
   * The bucket appears whatever it is worth. Worthless and always-shown is `T5`, not
   * hidden — the player asked to see this category, so the answer to a cheap one is a
   * smaller mark rather than no mark.
   */
  readonly alwaysShow: boolean;
  /** A few members, priced, best first. For reading the draft, not for emitting. */
  readonly examples: readonly string[];
};
