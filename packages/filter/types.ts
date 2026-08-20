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
 *
 * `varies` is not on the ladder at all, and makes no claim about loudness. It says the
 * price depends on something the filter cannot read: a Scrying Orb is 2c or 992c
 * depending on the map it is attuned to, and a block can see nothing past `Scrying Orb`.
 * Tiering it at either end would be a lie in one direction or the other, so it says so
 * instead. Manually maintained — see `hard-to-categorize.json`.
 */
export type Tier = "T0" | "T1" | "T2" | "T3" | "T4" | "T5" | "varies" | "hidden";

/** Which rule built the bucket, and therefore what its id means. */
export type BucketFamily =
  | "bases"
  | "corruptible-uniques"
  | "div-cards"
  | "foulborn"
  | "fragments"
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

/**
 * What the player sets before generating. Not market data — a statement about them.
 *
 * A lever is set and the filter regenerated, rather than moved against a finished one.
 * That is what lets a lever change which blocks exist at all instead of only how loud
 * they are.
 */
export type Levers = {
  /**
   * Least a single click may be worth, in chaos, for the bucket to appear at all.
   *
   * **The first lever here that hides on purpose.** Everything else in this classifier
   * serves the show-cheap baseline — a wrongly shown item costs a click, a wrongly hidden
   * one costs the item. This one is the player answering that a click is not free, and it
   * is allowed to win, because nobody else can price their time.
   *
   * In chaos rather than divine, unlike the tier cuts. The cuts are a market ladder and
   * belong in the market's own unit; this is a floor on attention, and it does not get
   * cheaper because divine went up.
   *
   * It reads differently on a stack: one click takes the whole pile, so this raises the
   * smallest stack worth bending for rather than hiding the currency. At 3c a Chaos Orb
   * is not shown until three of them are on the floor together.
   *
   * `0` disables it, and is the default — a floor nobody set should not hide anything.
   */
  readonly minClickValue: number;
  /**
   * Drop every unique map from the classification, whatever it is worth.
   *
   * **The one all-or-nothing lever, because the game leaves no middle setting.** A unique
   * map cannot be told from its neighbours cheaply enough to treat them apart, so the
   * honest choices are every unique map is worth a look or none of them are. This is the
   * player picking one.
   *
   * It deletes buckets rather than quieting them, which is why it is set before
   * generating and not moved against a finished filter. `false` is the default: it hides
   * on purpose, and nothing that hides on purpose gets to be the default here.
   */
  readonly hideUniqueMaps: boolean;
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
  /** Expected value of the plain outcome. What the tier is cut on. */
  readonly ev: number;
  /**
   * The vaal upside is the reason to care about this bucket, or part of it.
   *
   * **A flag, and only a flag.** It does not move `tier` and does not enter `ev` — the
   * bucket is tiered on what it is worth uncorrupted, and this says the corrupted outcome
   * is the reason to touch it anyway. A 1c base with a 20c corrupted ceiling tiers as a 1c
   * base and carries this, which is what lets the two compose downstream instead of one
   * quietly overruling the other.
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
   * Verbatim `.filter` lines the block must carry, one per entry. Empty on most buckets.
   *
   * **The escape hatch, and it exists because some keys are not derivable from anything
   * else here.** The generator writes a block's conditions out of the bucket's own fields
   * wherever it can — the family gives the class, the id gives the tier, `minStack` gives
   * a `StackSize >=`. Where a flag would have to be invented to say what the block needs,
   * the bucket says it in the filter's own words instead.
   *
   * The eight-modifier maps are the case that forced it. Counting an item's modifiers is
   * not a condition the grammar has, and the way it is actually done —
   * `HasExplicitMod >=8 "a" "e" "i" "o" "u" "y"`, leaning on every modifier name
   * containing a vowel — is a trick, not a property. No boolean on this type could carry
   * it and no generator would reinvent it, so it travels literally.
   *
   * Lines are emitted after the derived conditions, in order, unindented. Nothing
   * validates them: they are already in the target language, which is the point and the
   * risk.
   */
  readonly conditions: readonly string[];
  /**
   * Smallest stack that reaches this bucket's tier. `0` on a bucket nothing gates.
   *
   * The one property here that is a *quantity* rather than a fact about an item. A
   * stackable is the same item at every tier and only the count moves, so one currency
   * becomes several buckets — `@1`, `@11`, `@51` — each a block with its own
   * `StackSize >=`. Divination cards are deliberately left at `0`: a set is not a value
   * stack, and tiering a card at one card is the whole point of it.
   */
  readonly minStack: number;
  /**
   * The item this bucket was tiered on, and its price.
   *
   * A bucket is tiered at its best outcome, so one member decides the treatment for
   * everything sharing the block — and which one is not guessable from the id. On a
   * `gamble` it names the corrupted outcome instead: the tier still came off the plain
   * price, but the corrupted one is what the bucket is about.
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
