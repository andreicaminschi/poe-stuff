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
 * `T5` and `T6` are not "quieter than T4", they are a different promise: the smallest
 * marks the game can draw, for a bucket that must appear even though it is worth nothing.
 * Something has to sit between T4 and `hidden` for a category the player has asked to
 * always see. Two rungs rather than one because the leaguestart currency the player wants
 * on screen is itself two groups — the crafting mats worth bending for, and the wisdom
 * scrolls that are only worth seeing while there is nothing better.
 *
 * `varies` is not on the ladder at all, and makes no claim about loudness. It says the
 * price depends on something the filter cannot read: a Scrying Orb is 2c or 992c
 * depending on the map it is attuned to, and a block can see nothing past `Scrying Orb`.
 * Tiering it at either end would be a lie in one direction or the other, so it says so
 * instead. Manually maintained — see `hard-to-categorize.json`.
 */
export type Tier =
  | "T0"
  | "T1"
  | "T2"
  | "T3"
  | "T4"
  | "T5"
  | "T6"
  | "varies"
  | "hidden";

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
  | "replicas"
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
  /**
   * How much gold one divine orb is worth to this player.
   *
   * **The one price in the file that is not a market price, because gold has no market.**
   * It cannot be traded, so no feed quotes it and none ever will — the exchange has no
   * pair for it and `/compact` has no row. What a pile is worth is therefore a statement
   * about what the player does with gold, which is what makes it a lever rather than a
   * rate: at 1,000,000 to the divine a coin is a fifth of a thousandth of a chaos, and
   * every gold block in the filter follows from that one number.
   *
   * Stated as gold per divine rather than chaos per gold because that is the direction the
   * number is actually known in — nobody has an intuition for 0.0002c, everybody has one
   * for a million gold to the divine.
   */
  readonly goldPerDivine: number;
  /**
   * The most a unique base may be worth, in chaos, and still be worth a Vaal Orb.
   *
   * **The player pricing their own curiosity, and the thing that makes `gamble` a lever
   * rather than a constant.** A base is a gamble candidate when everything on it is cheap
   * enough to destroy without regret — so this is a ceiling on the *base*, read off its
   * most expensive unique, not on the one being corrupted.
   *
   * Moonstone Ring is the case it was written for. Anathema is around 10c and vaals into
   * something worth far more, so at a 30c ceiling the ring is marked; at 5c it is not,
   * because losing Anathema costs more than the player said they would spend.
   */
  readonly gambleCeiling: number;
  /**
   * Drop the expensive uniques on a base before reading its ceiling.
   *
   * **Off by default, because it is the one setting here that can lose an item.** A base
   * is normally priced at its most expensive unique, which is what stops Heavy Belt ever
   * being a gamble: Mageblood shares it. A player who knows that, and wants Bisco's Leash
   * marked for vaaling anyway, turns this on and names the price above which a unique
   * stops counting — anything dearer is assumed to be identified on sight rather than
   * corrupted by accident.
   *
   * `cutoff` is in chaos and is only read when `enabled`. At 100c a Heavy Belt prices off
   * Siegebreaker at 40c, with Mageblood and Dyadian Dawn set aside.
   */
  readonly gambleExclude: {
    readonly enabled: boolean;
    readonly cutoff: number;
  };
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
   * Every `.filter` condition line the block carries, in order. The whole of it.
   *
   * **The bucket says what it matches, in the filter's own words, and nothing downstream
   * guesses.** The id used to be the only answer, and it is prose: `map:nightmare` is a
   * base type spelled `Nightmare Map`, `stack:research/Forbidden Tome 68-70` is a base
   * type and an area level fused, and `misc:/Ancient Wombgift` has an empty category
   * where the slash implies one. An emitter reversing nine grammars gets those wrong
   * silently. The classifier has the row in hand and writes the lines instead.
   *
   * The eight-modifier maps are why the field is *lines* rather than a structure.
   * Counting an item's modifiers is not a condition the grammar has, and the way it is
   * actually done — `HasExplicitMod >=8 "a" "e" "i" "o" "u" "y"`, leaning on every
   * modifier name containing a vowel — is a trick, not a property. No field on this type
   * could carry it and no emitter would reinvent it, so everything travels literally and
   * the trick is not a special case.
   *
   * Written through `formatCondition`, so a name carrying a `#` throws here rather than
   * truncating a block that then quietly matches the wrong thing. Empty is a bug: a block
   * with no conditions matches every item on the floor.
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
  /**
   * The rung this bucket could turn out to belong to — its aspirational tier.
   *
   * **Equal to `tier` on everything except a unique `check`, and that is the whole of what
   * it is for.** A unique base is drawn at what it is *guaranteed* to be worth, so a 1c
   * Heavy Belt is a 1c label. But a beam is the only mark the game draws out in the world,
   * and how far worth walking a drop is depends on the upside rather than the guarantee —
   * so the beam is taken from this rung instead, and recoloured to say it is a maybe.
   *
   * Carried to the styler in the `#@` note, which is why it is on the bucket rather than
   * computed twice.
   */
  readonly upTo: Tier;
  /** A few members, priced, best first. For reading the draft, not for emitting. */
  readonly examples: readonly string[];
};

/**
 * `R G B A`, in the order a `Set*Color` line writes them.
 *
 * Alpha is spelled out rather than left to the game's default, because the default is not
 * the same number for all three lines — 240 on a background, 255 on a border and a text
 * colour. A table that omits it would be three different tables.
 */
export type Rgba = readonly [number, number, number, number];

/** The eleven names `MinimapIcon` and `PlayEffect` both take. */
export type EffectColour =
  | "Blue"
  | "Brown"
  | "Cyan"
  | "Green"
  | "Grey"
  | "Orange"
  | "Pink"
  | "Purple"
  | "Red"
  | "White"
  | "Yellow";

/** Every shape `MinimapIcon` accepts. */
export type IconShape =
  | "Circle"
  | "Cross"
  | "Diamond"
  | "Hexagon"
  | "Kite"
  | "Moon"
  | "Pentagon"
  | "Raindrop"
  | "Square"
  | "Star"
  | "Triangle"
  | "UpsideDownHouse";

/** One `MinimapIcon` line. `size` is 0, 1 or 2 — 0 is the largest the game draws. */
export type MinimapIcon = {
  readonly size: 0 | 1 | 2;
  readonly colour: EffectColour;
  readonly shape: IconShape;
};

/** One `PlayAlertSound` line. `id` is 1–16, `volume` 0–300. */
export type AlertSound = {
  readonly id: number;
  readonly volume: number;
};


/**
 * Everything a block's action lines say, already resolved.
 *
 * **One complete style, not a tier plus a diff.** The earlier shape had a tier carrying the
 * colours and the noise and a verb carrying only the mark on top, which worked while a verb
 * changed nothing else. `uniques.md` broke that: on a unique base a `take` is size L with a
 * sound, and a `check` at the same rung is size S in silence — so the verb decides the
 * loudness too. Once a verb can change every field, a diff is a whole style written
 * awkwardly.
 *
 * Nothing here knows about a bucket, a price or a condition. It is what a block looks like;
 * which items reach it is `classify.ts`'s business.
 */
export type BlockStyle = {
  readonly text: Rgba;
  readonly border: Rgba;
  readonly background: Rgba;
  /** 1–45. 45 is the largest the game draws. The size names live in `buckets.md`. */
  readonly fontSize: number;
  /** The alert sound, or `null` for silence. */
  readonly sound: AlertSound | null;
  /**
   * Keep the noise the game itself makes when the item lands.
   *
   * NeverSink's filters call this "drop" and `buckets.md` borrows the word: the metallic
   * clatter of a weapon or the high `pling` of an orb, which an item can carry *as well as*
   * a filter alert sound. It writes `EnableDropSound`, and it only says anything next to an
   * alert sound — which is exactly where `buckets.md` asks for it, on all four of its
   * sounds.
   */
  readonly dropSound: boolean;
  /**
   * The beam over the drop, or `null`.
   *
   * Always permanent. `buckets.md` writes `Beam:<colour>:Permanent` everywhere and has no
   * temporary beam at all — one that shows only as the item lands is one the player misses
   * while looking somewhere else, which defeats the point of asking for a beam.
   */
  readonly beam: EffectColour | null;
  /** The minimap icon, or `null` for none at all. */
  readonly icon: MinimapIcon | null;
};
