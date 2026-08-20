import { formatCondition } from "@poe/filter-eval/format-note";
import type {
  ExchangeRatioItem,
  GemItem,
  ItemCorruptions,
  ItemData,
} from "@poe/poe-watch/types";
import hardToCategorize from "./hard-to-categorize.json" with { type: "json" };
import maxStacks from "./max-stacks.json" with { type: "json" };
import type {
  Bucket,
  BucketFamily,
  FilterUnique,
  Levers,
  Tier,
  Verb,
} from "./types.ts";

/**
 * Turn a market snapshot into buckets a filter block can be written from.
 *
 * The one rule everything else serves: **it is better to show a cheap item than to hide
 * an expensive one.** A wrongly shown item costs a click. A wrongly hidden one costs the
 * item, and costs the player's trust in the filter, which is worth more. So every guard
 * below is asymmetric on purpose — thin data never hides, an unknown restriction never
 * excludes, and a bucket is tiered on its best outcome rather than its likeliest.
 */

/**
 * Floors for each tier, richest first, **in divine orbs**. Below the last one a bucket
 * can hide.
 *
 * Denominated in divine rather than chaos because chaos is not a stable unit — it drifts
 * against everything real over a league, and a ladder written in it silently re-tiers the
 * whole game as it goes. Divine is what players actually quote a price in once a number
 * gets large, so anchoring here is both the stabler choice and the one that matches how
 * the number is read.
 *
 * `T1` is exactly one divine on purpose: a Divine Orb on the floor is the reference drop,
 * and every other cut is placed relative to it. The four below reproduce the chaos numbers
 * this ladder was tuned at, back when divine was 200c.
 */
const TIER_CUTS: readonly (readonly [Tier, number])[] = [
  ["T0", 10],
  ["T1", 1],
  ["T2", 1 / 5],
  ["T3", 1 / 40],
  ["T4", 1 / 200],
];

/**
 * The ladder as a ranking, loudest first, with `hidden` as its quiet end.
 *
 * `varies` is deliberately absent: it is not on the ladder and nothing clamps against it.
 */
const TIER_RANK: readonly Tier[] = ["T0", "T1", "T2", "T3", "T4", "T5", "hidden"];

/**
 * A tier, raised to a floor if the price put it below one.
 *
 * The floor never lowers anything — a bucket that earned T0 keeps it. It only stops the
 * ladder going quieter than a category is allowed to be, which is how "exceptional gems
 * are never below T2" is said once rather than in every branch that builds one.
 */
const atLeast = (tier: Tier, floor: Tier): Tier =>
  tier === "varies" || TIER_RANK.indexOf(tier) <= TIER_RANK.indexOf(floor)
    ? tier
    : floor;

/**
 * A tier, moved `rungs` louder along the ladder. Clamped at `T0`.
 *
 * **The only place one bucket's tier is derived from another's, and it exists because no
 * feed prices what it is used for.** Nothing anywhere quotes a corrupted or an Originator
 * map, so the one true thing left to say about them is that they beat the plain map of the
 * same tier — and saying it *relatively* keeps it true when the plain map's price moves.
 * A hardcoded `T3` would be a snapshot of one afternoon's divine rate.
 *
 * `varies` is returned untouched: it is not on the ladder, so there is no rung to move it
 * from.
 */
const louder = (tier: Tier, rungs: number): Tier => {
  const at = TIER_RANK.indexOf(tier);
  return at < 0 ? tier : (TIER_RANK[Math.max(0, at - rungs)] ?? tier);
};

/**
 * `ceiling / floor` above which the floor is lying and the verb is no longer `take`.
 *
 * A generator constant, not a player lever. The player already owns the value thresholds;
 * a second knob here is how this grows into forty checkboxes.
 */
const RATIO_THRESHOLD = 10;

/**
 * A ceiling this high is T0 whatever the expected value says, **in divine orbs**. The one
 * deliberate exception to tiering on expected value: a one-in-a-million drop is worth
 * nothing on average and still deserves to stop the map.
 */
const T0_CEILING = 100;

/**
 * How many times the plain price the best corrupted outcome must clear before the bucket
 * is a gamble.
 *
 * **A compile-time constant, not a runtime lever.** It decides what the word `gamble`
 * means, and a definition that moves between runs is not a definition.
 *
 * Split out from `RATIO_THRESHOLD` despite starting at the same 10×. That one asks whether
 * a bucket's own floor and ceiling disagree, which is a question about identification;
 * this asks whether corrupting is worth more than keeping, which is a question about an
 * orb. They answer to different evidence and there is no reason they should move together.
 */
const VAAL_GAMBLE_RATIO = 10;

/**
 * The loss cap: the most a player will destroy on a corruption, in chaos.
 *
 * **A player lever, not a generator constant.** Unlike `RATIO_THRESHOLD`, this one is
 * meant to be moved, and the default is deliberately low — most players are far more
 * loss-averse than expected value says they should be.
 *
 * It is not a duplicate of the expected-value test, because expected value hides variance.
 * The ratio test is relative and a 525c ring with a 47,738c corrupted ceiling passes it
 * cleanly; the cap is absolute, and that is a ring almost nobody will actually vaal.
 *
 * **Failing it demotes to `take`, it never hides.** A 525c unique the player will not
 * gamble is still a 525c unique worth picking up, so the verb changes and the tier — which
 * is the plain price either way — does not move at all.
 */
const MAX_GAMBLE_FLOOR = 2;

/**
 * How much of a `check` bucket's ceiling to count. Hovering is free but the good outcome
 * is not the likely one, so a check tiers below its ceiling and well above its floor.
 */
const CHECK_DISCOUNT = 0.3;

/**
 * Listings in the last 24 hours below which a row is not evidence of a price.
 *
 * **A lever, and the one that answers open question 4 of the exploration doc — emit a
 * bucket on thin data, or stay silent.** Set it low and the filter cries wolf on prices
 * nobody paid; set it high and it goes quiet about real items that rarely trade.
 *
 * Unlike the loss cap this cannot move at runtime: it decides which rows are read at all,
 * so changing it means re-running the classifier. It is a generator lever, not a profile
 * one.
 *
 * At 20 it drops three fabricated prices that had each set a tier — a level 1 quality 11
 * Enlighten at 57,260c, a Foulborn Headhunter at 354,978c, and an Etched Hatchet at
 * 1,988c on zero listings. It also drops Mirror of Kalandra at 17 listings a day, House of
 * Mirrors at 16, Hinekora's Lock at 17, and 72 of the 75 divination cards. That is the
 * trade, and it runs against the show-cheap baseline in the one place the baseline cannot
 * help: a price with no listings behind it is not a cheap item, it is not an item at all.
 */
const MIN_DAILY_LISTINGS = 20;

/**
 * How many of each item fit in one stack, and therefore where its ladder stops.
 *
 * **The one bound on the stack ladder, and it is a fact about the game rather than a
 * judgement about drops.** Every tier is reachable by a big enough pile of anything, so
 * something has to say how big a pile can get: 50,000 Lifeforce is a stack that exists,
 * 4,574 Scrolls of Wisdom is not.
 *
 * Kept as data because it is data. Nothing here is derivable from the market feeds — the
 * APIs publish prices, not stack sizes — so the table is hand-maintained and meant to be
 * edited as sizes are learned. See the `_readme` in the file.
 */
const MAX_STACK_BY_NAME = new Map<string, number>(
  Object.entries(maxStacks.byName),
);

const MAX_STACK_BY_CATEGORY = new Map<string, number>(
  Object.entries(maxStacks.byCategory),
);

/**
 * The same item, with the roll or variant PoeWatch spells into its name taken off.
 *
 * `Scrying Orb (Basilica)` and `Scrying Orb (Vaal Pyramid)` are one item at two prices.
 * There are 137 of them and there will be more every league, so the table holds
 * `Scrying Orb` once and the bracket is stripped on the way in.
 */
const withoutVariant = (name: string): string => name.replace(/ \([^()]*\)$/, "");

/**
 * The stack ceiling for one item.
 *
 * Name, then the name without its variant, then category, then the default. Name leads
 * because the categories are PoeWatch's filing rather than the game's: Crystallised
 * Lifeforce sits in `currency` and does not stack like currency, and a category-first
 * lookup would quietly cap it at twenty.
 *
 * The exact name still wins over the stripped one, so a variant that really does stack
 * differently can be listed on its own and will be found first.
 */
const maxStack = (category: string, name: string): number =>
  MAX_STACK_BY_NAME.get(name) ??
  MAX_STACK_BY_NAME.get(withoutVariant(name)) ??
  MAX_STACK_BY_CATEGORY.get(category) ??
  maxStacks.default;

/**
 * What the player gets when they set nothing.
 *
 * A click floor of zero, because a lever nobody has touched must not be quietly hiding
 * items — the show-cheap baseline is the default, and this is what opts out of it.
 */
const DEFAULT_LEVERS: Levers = {
  minClickValue: 0,
  hideUniqueMaps: false,
  goldPerDivine: 1_000_000,
};

const price = (item: ItemData): number => item.mean ?? 0;

const listings = (item: ItemData): number => item.daily ?? 0;

/** An item and the roll it was priced at, the brackets back where PoeWatch had them. */
const named = (name: string, variant: string): string =>
  variant === "" ? name : `${name} (${variant})`;

/** A price short enough to sit in a sentence. */
const chaos = (value: number): string =>
  value >= 1000 ? `${Math.round(value / 1000)}kc` : `${Math.round(value)}c`;

/**
 * A price nobody actually paid. One listing, flagged low-confidence, and enormous — that
 * is a mirror-service advert or a troll, and left in it prices a Heavy Belt at 177,489c
 * and a tier-8 map at 1.7e13c.
 *
 * Deliberately narrow. It has to catch fiction without catching a genuinely rare item,
 * so it demands all three signals at once.
 */
const isTroll = (item: ItemData): boolean =>
  item.lowConfidence && listings(item) <= 2 && price(item) > 5000;

/**
 * Rows this classifier will not read. The listings floor subsumes the troll guard at any
 * setting above 2, so both are named here rather than one quietly shadowing the other.
 *
 * Nothing the exchange prices ever reaches this test. Those rows are pulled out of
 * `/compact` before any of it runs and become buckets of their own — see `classify` — so
 * the floor only ever judges a scraped listing, which is the only thing it was ever meant
 * to disbelieve.
 */
const ignored = (item: ItemData): boolean =>
  listings(item) < MIN_DAILY_LISTINGS || isTroll(item);

/**
 * Barely traded, or flagged unreliable. Recorded on the bucket and never acted on here:
 * div cards and Mirrors of Kalandra are thin by this test and obviously worth showing.
 */
const isThin = (item: ItemData): boolean =>
  item.lowConfidence || (item.daily ?? 0) < 10;

/**
 * What a PoeWatch row is actually about, once its naming is unpicked.
 *
 * PoeWatch spells three different things into one name field: identification state, the
 * league mechanic, and the specific roll. `Unidentified Foulborn Headhunter (Culling)` is
 * all three at once.
 *
 * - **Identification state is dropped.** A filter can read it, but the player is not
 *   asking for two treatments of one item, so identified and unidentified share a bucket.
 *   See the note in `TODO.md` before splitting them.
 * - **The league mechanic is kept**, because a Foulborn item comes from somewhere else and
 *   gets its own section of the filter.
 * - **The roll is kept out of the bucket key but carried alongside it.** `(Culling)` and
 *   `(Minimap Icons)` are two Foulborn Headhunters, and the filter cannot read the mod
 *   that separates them — so they are one bucket, priced at the best of them, which then
 *   says which one that was. The bucket is the filter's business; the variant is the
 *   reader's.
 */
type ItemIdentity = {
  readonly name: string;
  readonly foulborn: boolean;
  /** The parenthesised roll, without its brackets. Empty where the row carries none. */
  readonly variant: string;
};

const identify = (raw: string): ItemIdentity => {
  const identified = raw.replace(/^Unidentified\s+/, "");
  const foulborn = /^Foulborn\s+/.test(identified);
  const variant = /\s*\(([^)]*)\)\s*$/.exec(identified);

  return {
    name: identified
      .replace(/^Foulborn\s+/, "")
      .replace(/\s*\([^)]*\)\s*$/, "")
      .trim(),
    foulborn,
    variant: variant?.[1]?.trim() ?? "",
  };
};

/**
 * Foulborn and plain versions of one unique are separate buckets, so the price map needs
 * both in one place without either overwriting the other.
 */
const priceKey = (name: string, foulborn: boolean): string =>
  foulborn ? `foulborn:${name}` : name;

/**
 * Which of the three unique passes is running, and therefore which uniques belong to it.
 *
 * The game hands the filter two flags that split one base's uniques into disjoint sets —
 * `Foulborn` and `Replica` — and each set is a block of its own, above the plain one and
 * carrying the flag. Everything else about the three passes is identical, which is why
 * they are one function taking this rather than three functions.
 */
type UniqueOverlay = "plain" | "foulborn" | "replica";

/** Which family each pass files its buckets under. */
const OVERLAY_FAMILY: Record<UniqueOverlay, BucketFamily> = {
  plain: "uniques-by-base",
  foulborn: "foulborn",
  replica: "replicas",
};

/** The line that says which set this is. The plain pass is the one with nothing to add. */
const OVERLAY_CONDITION: Record<UniqueOverlay, readonly string[]> = {
  plain: [],
  foulborn: ["Foulborn True"],
  replica: ["Replica True"],
};

/**
 * A replica is a unique whose name is the ordinary one with `Replica ` in front. That is
 * the whole of the distinction in every feed here, and it matches what the game does.
 */
const isReplica = (name: string): boolean => /^Replica\s+/.test(name);

const UNIQUE_CATEGORIES = new Set([
  "accessories",
  "armour",
  "flasks",
  "jewels",
  "weapons",
]);

/**
 * The only gem levels worth a block.
 *
 * 1 is what drops and what a levelling character wants. 20 is the top of the ordinary
 * range. 21 exists only through a corruption, which is why it sits here beside quality 23
 * rather than anywhere near the plain prices.
 *
 * Everything between is a gem somebody is part-way through levelling, and nothing on the
 * floor is ever in that state.
 */
const GEM_LEVELS = new Set([1, 20, 21]);

/**
 * The only gem qualities worth a block: none, the ordinary maximum, and the corrupted
 * maximum.
 *
 * Dropping the rest also drops a class of bad price: a quality nobody trades is priced
 * off a handful of listings, and `gem:Enlighten Support` was tiered T0 by a single
 * level 1, quality 11 row at 57,260c against a real price of 199c.
 */
const GEM_QUALITIES = new Set([0, 20, 23]);

/** The top of the ordinary range. Levelling reaches it; only a corruption passes it. */
const MAX_GEM_LEVEL = 20;

const MAX_GEM_QUALITY = 20;

/**
 * Past what levelling can reach, on either axis.
 *
 * **The only state an ordinary gem is ever worth a block in.** Everything at or below
 * 20/20 is either what a vendor sells or what a socket produces, and neither arrives on
 * the floor: a levelled gem is levelled in a socket, not dropped. What does arrive is a
 * corrupted one out of a Vaal vessel, and that is exactly the state past this line.
 */
const overCorrupted = (item: GemItem): boolean =>
  item.gemLevel > MAX_GEM_LEVEL || item.gemQuality > MAX_GEM_QUALITY;

/**
 * The prefix that marks a Vaal gem.
 *
 * Complete and exclusive: every Vaal gem in the game is spelled this way and nothing else
 * is. There is no flag to read instead — PoeWatch files a Vaal gem in `gem` like any
 * other.
 */
const VAAL_PREFIX = "Vaal ";

/**
 * A Vaal gem — which is to say, a corruption outcome wearing a different name.
 *
 * **It gates in beside the over-rolled states and for the same reason.** A Vaal Orb can
 * raise the level, raise the quality, or turn the gem Vaal, and the third is no less an
 * outcome than the other two. Reading only the numbers would file a Vaal Blight at 20/20
 * as a levelled gem that could not have dropped, when it is the one thing on that branch
 * that certainly did.
 */
const isVaalGem = (name: string): boolean => name.startsWith(VAAL_PREFIX);

/**
 * The suffix that marks a Trarthus gem.
 *
 * They are shaped like transfigurations and the wiki files them as such — same
 * `base_item` pointing back at the skill they alter — but they are not cut from a Divine
 * Font. They drop, already at 20/20, which is why they are the one ordinary gem that
 * needs that state and why the name is the only thing separating them from the 200-odd
 * gems the player made on purpose.
 */
const TRARTHUS_SUFFIX = " of Trarthus";

/**
 * The state a gem is in when it hits the floor, and so the only one worth pricing a drop
 * at.
 *
 * Shared by the exceptional gems and the Trarthus ones for the same reason: both drop and
 * neither is levelled by whoever finds it. Every other state they trade in is somebody's
 * work after the fact.
 */
const DROP_LEVEL = 1;

const DROP_QUALITY = 0;

/**
 * The quietest an exceptional gem may be tiered.
 *
 * These do not drop from the general pool, they cap at level 3 or 4 rather than 20, and
 * the cheap ones are still worth several times a click. Tiering one at T4 off a soft week
 * on the market would be reading a number the item's own rarity contradicts.
 */
const EXCEPTIONAL_MIN_TIER: Tier = "T2";

/**
 * How a gem is filed, which decides how much of its identity reaches the bucket key.
 *
 * Three rules, because gems arrive on the floor three different ways:
 *
 * - `exceptional` — the game's `Exceptional` tag, read off the wiki. These are the gems
 *   that are worth money as they drop, so they are priced at level 1 quality 0 and shown
 *   whatever that price says. Never hidden.
 * - `transfigured` — cut from a Divine Font by the player. The value is the *event*, not
 *   the number: the player did something to get it and should see that it happened, and
 *   no price on the floor tells them which transfiguration is the good one. Tiered
 *   `varies` and left alone.
 * - `trarthus` — the twelve `X of Trarthus` gems. Transfigured in shape and a drop in
 *   fact: the wiki has them dropping from area level 5, so they are priced where they
 *   land, at level 1 quality 0, exactly as an exceptional gem is.
 * - `vendor` — everything else, active and support alike. Buyable for a wisdom scroll, so
 *   nothing at or under 20/20 is worth a block and only a corruption past it is.
 *
 * None of the four can be hidden. Three of them are somewhere the player has been, and the
 * fourth is what a Vaal vessel pays out.
 */
type GemKind = "exceptional" | "transfigured" | "trarthus" | "vendor";

/** Categories that stack, and whose buckets a stack-size condition will later gate. */
const STACKABLE_CATEGORIES = new Set([
  "azmeri",
  "catalysts",
  "chayula",
  "currency",
  "deepwater",
  "delirium",
  "delve",
  "divination",
  "essence",
  "fragment",
  "heist",
  "heistobjective",
  "legion",
  "oils",
  "research",
  "ritual",
  "scarab",
]);

/**
 * Whether an item stacks, and so earns a ladder of blocks rather than one.
 *
 * Category answers for almost everything. The exception is `maps`, which on the exchange
 * feed is not maps: PoeWatch files the splinters there — Timeless, Simulacrum — alongside
 * Voidborn Reliquary Key, which is a single-drop item that would be nonsense to gate on a
 * stack of four. So the splinters are picked out by name, because their name is the only
 * thing separating them from what they are filed with.
 */
const stacks = (category: string, name: string): boolean =>
  STACKABLE_CATEGORIES.has(category) || isSplinter(name);

/**
 * Both spellings the game uses. Legion, Simulacrum and Ritual put the word last —
 * `Timeless Karui Splinter` — and Breach puts it first, as `Splinter of Chayula`. Matching
 * only one of them loses a whole league mechanic the season it comes back.
 */
const isSplinter = (name: string): boolean =>
  name.endsWith(" Splinter") || name.startsWith("Splinter of ");

/**
 * A `BaseType ==` line for one name.
 *
 * `==` and never `=`, because `=` on text matches part of the name: `BaseType "Simulacrum"`
 * takes a Simulacrum Splinter too, and two buckets that overlap are two blocks where the
 * first eats the second.
 *
 * Through `formatCondition` so a name carrying a `#` throws here. A `#` starts a comment,
 * so the line would load, lose its tail, and match something else entirely.
 */
const baseTypeIs = (name: string): string => formatCondition(`BaseType == "${name}"`);

/**
 * PoeWatch's frame number as the word the filter uses for it.
 *
 * Frame is how the game colours an item's name and `Rarity` is the filter's word for the
 * same fact, so this is a spelling change and not a decision. Frame 3 is unique and is
 * absent because every path that meets one branches on it before reaching here.
 */
const RARITY_BY_FRAME: Readonly<Record<number, string>> = {
  0: "Normal",
  1: "Magic",
  2: "Rare",
};

/**
 * Where a name-keyed item lands: its bucket id, and the family that id belongs to.
 *
 * One rule, used by both the compact pass and the exchange pass. An id is a block marker
 * a runtime editor looks up, so one category must never end up with two spellings of it
 * depending on which feed the price came from.
 */
function placement(
  category: string,
  name: string,
): { id: string; family: BucketFamily } {
  // The bracket goes first. A filter matches a base type, and `Scrying Orb (Basilica)` is
  // not one — the game puts a Scrying Orb on the floor and the block can read nothing
  // past that. Keeping the variants apart would write 87 blocks where 86 can never fire,
  // all of them matching the item the first one already caught.
  const base = withoutVariant(name);

  if (category === "card") return { id: `card:${base}`, family: "div-cards" };
  if (stacks(category, base)) {
    return { id: `stack:${category}/${base}`, family: "stackables" };
  }
  return { id: `misc:${category}/${base}`, family: "misc" };
}

/**
 * Base types whose price the filter cannot see, tiered `varies` whatever they cost.
 *
 * Read from a file because the judgement is not in the data: no feed says which base
 * types hide a spread behind a name, and nothing computable would find them. See the
 * `_readme` in `hard-to-categorize.json`.
 *
 * Matched on the variant-stripped name, so one entry covers every bracket the league adds.
 */
const HARD_TO_CATEGORIZE = new Set<string>(hardToCategorize.names);

/** What one item is worth once corrupted, at its best believable outcome. */
type VaalCeiling = {
  readonly ceiling: number;
  readonly thin: boolean;
  /** The implicit that outcome rolled, rolls left as `#`. What the orb has to hit. */
  readonly mod: string;
};

/** What one unique sells for, and what it sells for corrupted. */
type UniquePrice = {
  readonly plain: number;
  readonly corrupted: number;
  readonly thin: boolean;
  /** The roll the row that set `plain` was carrying. Empty where it carried none. */
  readonly variant: string;
  /**
   * The implicit behind `corrupted`, and the roll of the row it belongs to. A separate
   * pair from `variant`: the best plain outcome and the best corrupted one are routinely
   * different rows of the same unique.
   */
  readonly corruptedMod: string;
  readonly corruptedVariant: string;
};

/** A bucket under construction, before the verb and tier are decided. */
type Draft = {
  id: string;
  family: BucketFamily;
  verb: Verb;
  floor: number;
  ceiling: number;
  thin: boolean;
  members: number;
  slots: number;
  note: string;
  /** Verbatim `.filter` lines this block must carry. Empty on everything derivable. */
  conditions: readonly string[];
  /** Smallest stack that reaches this bucket. 0 on everything a stack does not gate. */
  minStack: number;
  /** The base type hides a spread the filter cannot read. Forces the `varies` tier. */
  varies: boolean;
  alwaysShow: boolean;
  /**
   * The quietest this bucket may be tiered, whatever the price says. `"hidden"` is no
   * floor at all — the ladder decides on its own.
   *
   * `alwaysShow` is the same idea at its weakest setting and stays separate because it
   * also survives the click floor, which a tier floor does not need to.
   */
  minTier: Tier;
  /** Best corrupted outcome anywhere in the bucket. 0 when nothing in it is corruptible. */
  vaalCeiling: number;
  /** Plain price of the member that ceiling belongs to — what the orb would destroy. */
  vaalFloor: number;
  /** Which member that ceiling belongs to. Only ever shown when the vaal actually fires. */
  vaalName: string;
  /** That member's roll, and the implicit the orb has to hit. Empty where unknown. */
  vaalVariant: string;
  vaalMod: string;
  /** The member whose plain price set the ceiling, and that price. */
  topName: string;
  topPrice: number;
  /** That member's roll, where PoeWatch prices the rolls apart. Empty where it does not. */
  topVariant: string;
  /**
   * Whether that price came off the Currency Exchange rather than out of `/compact`.
   * Travels with `topName`, because that member is the one the bucket names as having
   * set it — a bucket whose top is exchange-priced is a bucket priced by a real book.
   */
  topFromExchange: boolean;
  examples: string[];
};

export type ClassifyInput = {
  readonly items: readonly ItemData[];
  readonly corruptions: readonly ItemCorruptions[];
  /** The Currency Exchange side. Wherever it has an item, it is the price. */
  readonly exchange: readonly ExchangeRatioItem[];
  readonly uniques: readonly FilterUnique[];
  /**
   * Every gem carrying the game's `Exceptional` tag, by name. Priced at level 1 quality
   * 0 and never hidden — see `flatBuckets`.
   */
  readonly exceptionalGems: readonly string[];
  /** Every transfigured gem, by name. Tiered `varies` — see `flatBuckets`. */
  readonly transfiguredGems: readonly string[];
};

/**
 * What one exchange row costs in chaos.
 *
 * `chaosValue` restates the chaos side in chaos and is what a bucket wants; `value` is the
 * same number for that side, and the fallback for a row that omits it.
 */
const exchangePrice = (item: ExchangeRatioItem): number =>
  item.chaos.chaosValue ?? item.chaos.value;

/** The id of the injected Chaos Orb row. Negative, because no PoeWatch id is. */
const CHAOS_ORB_ID = -1;

/**
 * Chaos Orb, at one chaos, because nothing else will say so.
 *
 * It is in neither feed and that is not an omission: the exchange quotes every item
 * *against* chaos, so chaos has no pair of its own, and `/compact` prices what listings
 * ask rather than the unit they ask in. The one price in the game that is true by
 * definition is therefore the one price nobody publishes.
 *
 * Injected as an exchange row rather than special-cased downstream, so it earns its stack
 * ladder from exactly the same arithmetic as every other orb. The zeroed fields are the
 * shape a never-traded side comes back as, and nothing reads them.
 */
const CHAOS_ORB: ExchangeRatioItem = {
  id: CHAOS_ORB_ID,
  name: "Chaos Orb",
  icon: "",
  category: "currency",
  chaos: {
    value: 1,
    chaosValue: 1,
    lowConfidence: false,
    timestamp: 0,
    volume: 0,
    change24H: 0,
  },
  divine: {
    value: 0,
    lowConfidence: false,
    timestamp: 0,
    volume: 0,
    change24H: 0,
  },
};

/** The id of the injected Gold row. Negative, because no PoeWatch id is. */
const GOLD_ID = -2;

const GOLD = "Gold";

/**
 * The smallest gold pile that must appear, and the quietest it may appear at.
 *
 * **A deliberate skew, and the only one in the file.** At a million gold to the divine a
 * pile of 3,000 is worth 0.61c, which is under the T4 cut and would be hidden by every
 * rule here — correctly, if the question were what one click of gold is worth. It is not.
 * Gold is spent in five and six figures at the Kalguur market and accrues in piles this
 * size, so the pile the player wants to see is smaller than the pile the ladder would
 * show, and this is where the two are reconciled. NeverSink draws the same line in the
 * same place, at 3,001.
 *
 * It sets a *floor*, so the ladder above it is untouched: 25,000 still earns T3 on the
 * arithmetic, and a genuinely large pile still gets louder on its own. Only the bottom
 * rung is a decision rather than a price. See `goldPerDivine`.
 */
const GOLD_FLOOR: { readonly stack: number; readonly tier: Tier } = {
  stack: 3_000,
  tier: "T4",
};

/**
 * Gold, priced off the player's own ratio, because no market will price it.
 *
 * Injected as an exchange row for the same reason `CHAOS_ORB` is: the stack ladder, the
 * tier cuts and the block shape are all machinery that already exists, and gold is an
 * ordinary stackable currency in every respect except that its price is a preference. The
 * zeroed fields are the shape a never-traded side comes back as, and nothing reads them.
 */
const goldRow = (rates: Rates, levers: Levers): ExchangeRatioItem => ({
  id: GOLD_ID,
  name: GOLD,
  icon: "",
  category: "currency",
  chaos: {
    value: rates.divine / levers.goldPerDivine,
    chaosValue: rates.divine / levers.goldPerDivine,
    lowConfidence: false,
    timestamp: 0,
    volume: 0,
    change24H: 0,
  },
  divine: {
    value: 0,
    lowConfidence: false,
    timestamp: 0,
    volume: 0,
    change24H: 0,
  },
});

/** The exchange prices the rest of this file is denominated in. */
type Rates = {
  /** One divine orb, in chaos. Every tier cut is a multiple of this. */
  readonly divine: number;
};

/**
 * The price the ladder itself is written in, read off the exchange at classify time.
 *
 * A missing divine is fatal rather than defaulted. Every cut in `TIER_CUTS` is a multiple
 * of it, so a guess here does not mis-tier one bucket, it mis-tiers the league — and it
 * does so silently, which is the part worth throwing over.
 *
 * The Vaal Orb price used to be read here too, to charge a gamble for the orb it spends.
 * Nothing costs a gamble anything now: the corrupted ceiling is a flag rather than a term
 * in an expectation, so there is no expectation left to subtract from.
 */
export function marketRates(exchange: readonly ExchangeRatioItem[]): Rates {
  const row = exchange.find((item) => item.name === "Divine Orb");
  const divine = row === undefined ? 0 : exchangePrice(row);

  if (divine <= 0) {
    throw new Error("no Divine Orb price on the exchange: every tier cut needs it");
  }

  return { divine };
}

/**
 * The chaos price of every item the exchange has a real market for, keyed by the id
 * `/compact` uses.
 *
 * **The exchange owns every item in it.** It prices what actually changes hands on the
 * Currency Exchange — a real book with a real counterparty — where `/compact` prices what
 * somebody put in a trade listing. For a Mirror of Kalandra those are not the same claim,
 * and only one of them is a price. So an id in here is dropped from `/compact` entirely
 * rather than merged with it: two sources for one item is two entries disagreeing in
 * public, and the answer to which one is right is already known.
 */
function exchangeQuotes(
  exchange: readonly ExchangeRatioItem[],
): Map<number, number> {
  const quotes = new Map<number, number>();

  for (const item of exchange) {
    // A side that never traded comes back as zeroes rather than absent, and a zero is not
    // a price — leaving it out lets `/compact` answer for that item instead.
    const price = exchangePrice(item);
    if (price > 0) quotes.set(item.id, price);
  }

  return quotes;
}

/**
 * The best corrupted outcome per item id, with the same troll guard the item prices get.
 *
 * `daily` on a corruption outcome is far lower than on a plain item — a specific implicit
 * on a specific unique is a thin market by nature — so thinness is recorded rather than
 * used to drop the outcome.
 */
function vaalCeilings(
  corruptions: readonly ItemCorruptions[],
): Map<number, VaalCeiling> {
  const ceilings = new Map<number, VaalCeiling>();

  for (const { item_id: itemId, corruptions: outcomes } of corruptions) {
    // The listings floor applies here too. It costs more than elsewhere — 58% of priced
    // outcomes go, and 1,144 of 1,989 items lose their last one — but a corrupted price
    // nobody paid is exactly the kind of number that talks a player into destroying an
    // item, so it is the last place to be generous.
    const believable = outcomes.filter(
      (outcome) => (outcome.daily ?? 0) >= MIN_DAILY_LISTINGS,
    );
    if (believable.length === 0) continue;

    // Reduced rather than `Math.max`ed: the mod is the point of this now, and the maximum
    // of the means cannot say which outcome it came from.
    const best = believable.reduce((left, right) =>
      right.mean > left.mean ? right : left,
    );

    ceilings.set(itemId, {
      ceiling: best.mean,
      thin: !believable.some(
        (outcome) => !outcome.lowConfidence && outcome.daily >= 2,
      ),
      // Two-line implicits arrive as one string joined by a literal backslash-n, which
      // would print as an escape rather than a break. A separator reads on one line.
      mod: best.name.replaceAll(/\\n|\n/g, " / "),
    });
  }

  return ceilings;
}

/**
 * Every priced unique, keyed by `priceKey` — its GGG name, and whether it is Foulborn.
 *
 * The best price across a unique's rows wins, not the mean of them: the rows are roll
 * bands and identification states of one item, and the bucket is tiered on its best
 * outcome.
 *
 * Rows naming a base rather than a unique — PoeWatch prices `Unidentified Foulborn Onyx
 * Amulet` — simply join to nothing later and fall out, because no unique carries that
 * name.
 */
function uniquePrices(
  items: readonly ItemData[],
  ceilings: Map<number, VaalCeiling>,
): Map<string, UniquePrice> {
  const prices = new Map<string, UniquePrice>();

  for (const item of items) {
    if (item.frame !== 3 || ignored(item)) continue;
    if (!UNIQUE_CATEGORIES.has(item.category) && item.category !== "maps") {
      continue;
    }

    const { name, foulborn, variant } = identify(item.name);
    const key = priceKey(name, foulborn);
    const seen = prices.get(key);

    // Which row won is asked outright rather than taken from `Math.max`, on both sides:
    // the variant and the mod both belong to a row, and a maximum forgets which row it
    // came from.
    const plain = price(item);
    const beats = seen === undefined || plain > seen.plain;

    const ceiling = ceilings.get(item.id);
    const vaal = ceiling?.ceiling ?? 0;
    const vaalBeats = seen === undefined || vaal > seen.corrupted;

    prices.set(key, {
      plain: beats ? plain : seen.plain,
      corrupted: vaalBeats ? vaal : seen.corrupted,
      thin: (seen?.thin ?? true) && isThin(item),
      variant: beats ? variant : seen.variant,
      corruptedMod: vaalBeats ? (ceiling?.mod ?? "") : seen.corruptedMod,
      corruptedVariant: vaalBeats ? variant : seen.corruptedVariant,
    });
  }

  return prices;
}

/**
 * One bucket per base type that can actually drop a unique — the whole unique story for
 * that base, corruption included.
 *
 * This is the bucket the filter exists for: a Leather Belt on the floor is a 1c belt or
 * it is Headhunter, and nothing the filter can read tells the two apart. So the bucket is
 * tiered at its best member and the player resolves it by hovering, which is free.
 *
 * **Corruption rolls up to the base, it does not get its own bucket.** A block keyed on
 * one unique could never fire: the filter reads rarity and base type, never which unique
 * this is, so `Shiversting` is not a thing a block can match. What survives is the best
 * corrupted outcome across the base's droppable members, carried as `vaalCeiling` — a
 * property of the base bucket, and a lever the player can switch off.
 *
 * `restrictedDrop` members are excluded, and that exclusion is the only thing keeping
 * these honest — a Viridian Jewel is never Impossible Escape, an Amethyst Ring is never
 * Original Sin, and counting them would light up every jewel on the ground.
 *
 * **The replica pass is the one place that exclusion is wrong, and deliberately ignored.**
 * The wiki marks 102 of the 103 replicas restricted, which is true of where they come from
 * — a Grand Heist, not the general pool — and would delete the whole family if it were
 * read here. It is safe to ignore for exactly the reason it exists everywhere else: the
 * flag guards against a block promising a unique its base cannot roll, and `Replica True`
 * is on the block, so the block already says which item it means. Replica Alberon's
 * Warpath is 5,564c on a Soldier Boots whose plain bucket hides.
 */
function uniqueBaseBuckets(
  uniques: readonly FilterUnique[],
  prices: Map<string, UniquePrice>,
  overlay: UniqueOverlay,
): Draft[] {
  const foulborn = overlay === "foulborn";
  const replica = overlay === "replica";
  const byBase = new Map<string, FilterUnique[]>();

  for (const unique of uniques) {
    // A dropped replica reads `Replica True`, so the block carrying that line is written
    // above the plain one and takes it first. The plain bucket must therefore not be
    // priced off a member it will never see.
    if (isReplica(unique.name) !== replica) continue;
    if (unique.restrictedDrop && !replica) continue;
    const members = byBase.get(unique.baseType);
    if (members === undefined) byBase.set(unique.baseType, [unique]);
    else members.push(unique);
  }

  const drafts: Draft[] = [];

  for (const [baseType, members] of byBase) {
    const priced = members.flatMap((member) => {
      const found = prices.get(priceKey(member.name, foulborn));
      return found === undefined ? [] : [{ name: member.name, ...found }];
    });
    if (priced.length === 0) continue;

    priced.sort((left, right) => right.plain - left.plain);
    const plain = priced.map((member) => member.plain);
    const top = priced.reduce((left, right) => (right.plain > left.plain ? right : left));
    const best = priced.reduce((left, right) =>
      right.corrupted > left.corrupted ? right : left,
    );

    drafts.push({
      id:
        overlay === "plain"
          ? `unique:${baseType}`
          : `unique:${overlay}/${baseType}`,
      family: OVERLAY_FAMILY[overlay],
      verb: "check",
      floor: Math.min(...plain),
      ceiling: Math.max(...plain),
      vaalCeiling: best.corrupted,
      // The best vaal and the best plain outcome are often different uniques on one base
      // — Moonstone Ring's ceiling is Shavronne's Revelation, its vaal is Anathema. The
      // ratio and the loss cap both concern the item being vaaled, so both read this.
      vaalFloor: best.plain,
      thin: priced.every((member) => member.thin),
      members: priced.length,
      slots: 0,
      note: `${priced.length}/${members.length} priced`,
      // A unique's BaseType is the base it rolled on, so these two lines are every unique
      // on that base and nothing else. The Foulborn and Replica passes add their flag in
      // front: the same base, from somewhere else, and the plain block below would take
      // both. The extra line is also what orders them — the emitter writes the block
      // saying more about an item above the one saying less.
      conditions: [
        ...OVERLAY_CONDITION[overlay],
        "Rarity Unique",
        baseTypeIs(baseType),
      ],
      minStack: 0,
      // A unique base is exactly what the filter can read, so nothing here is unknowable.
      varies: false,
      minTier: "hidden",
      vaalName: best.corrupted > 0 ? best.name : "",
      vaalVariant: best.corrupted > 0 ? best.corruptedVariant : "",
      vaalMod: best.corrupted > 0 ? best.corruptedMod : "",
      topName: top.name,
      topPrice: top.plain,
      topVariant: top.variant,
      // No unique is on the exchange — it prices stackables, cards and a handful of maps,
      // and nothing here comes off that book.
      topFromExchange: false,
      alwaysShow: foulborn,
      examples: priced
        .slice(0, 3)
        .map((member) => `${member.name} ${Math.round(member.plain)}c`),
    });
  }

  return drafts;
}

/**
 * White bases, one bucket per base name and influence, carrying the item level where the
 * price actually appears.
 *
 * A base is priced per ilvl, and the filter would rather ask `ItemLevel >= 84` once than
 * list four rows, so the rows for one base collapse to a block carrying that cut. The cut
 * is the lowest ilvl still worth at least half the best — an approximation, and the
 * generous direction of one.
 */
function baseBuckets(items: readonly ItemData[]): Draft[] {
  // A non-empty tuple: every group is created with its first row, and saying so is what
  // lets `rows[0]` stand for the footprint without a guard that can never fire.
  const groups = new Map<string, [ItemData, ...ItemData[]]>();

  for (const item of items) {
    if (item.category !== "bases" || ignored(item)) continue;

    // Influenced white bases are skipped on purpose. What one is worth depends on the
    // influence mod pool it can roll, and a single number per base is not a price of
    // anything — a Shaper Hubris Circlet is two different items depending on which
    // build wants which mod. Pricing them needs a source that knows the pool, and that
    // source is coming. Uniques are untouched by this: they are bucketed by base in
    // `uniqueBaseBuckets`, which never reads these rows.
    if (item.influences !== "") continue;

    const rows = groups.get(item.name);
    if (rows === undefined) groups.set(item.name, [item]);
    else rows.push(item);
  }

  return [...groups].map(([name, rows]) => {
    const best = Math.max(...rows.map(price));
    const topRow = rows.reduce((l, r) => (price(r) > price(l) ? r : l));
    const paying = rows
      .filter((row) => price(row) >= best / 2)
      .map((row) => row.itemLevel)
      .filter((level): level is number => level !== null && level > 0);
    const sorted = [...rows].sort((left, right) => price(right) - price(left));

    const draft: Draft = {
      id: `base:${name}`,
      family: "bases",
      verb: "take",
      floor: best,
      ceiling: best,
      thin: rows.every(isThin),
      members: rows.length,
      slots: rows[0].width * rows[0].height,
      note: paying.length === 0 ? "" : `ilvl>=${Math.min(...paying)}`,
      // The ilvl cut is the whole reason this bucket collapsed four rows into one, so it
      // is a condition and not only a note. Without it the block takes an ilvl 60 drop at
      // the price of an ilvl 84 one.
      conditions: [
        "Rarity Normal",
        baseTypeIs(name),
        ...(paying.length === 0 ? [] : [`ItemLevel >= ${Math.min(...paying)}`]),
      ],
      minStack: 0,
      varies: false,
      minTier: "hidden",
      alwaysShow: false,
      vaalCeiling: 0,
      vaalFloor: 0,
      vaalName: "",
      vaalVariant: "",
      vaalMod: "",
      topName: `ilvl ${topRow.itemLevel}`,
      topPrice: best,
      topVariant: "",
      // White bases are not traded on the exchange, so this price is a listing every time.
      topFromExchange: false,
      examples: sorted
        .slice(0, 2)
        .map((row) => `ilvl${row.itemLevel} ${Math.round(price(row))}c`),
    };

    return draft;
  });
}

/**
 * Somewhere to accumulate drafts by bucket id, and the one rule for folding a row into
 * one of them.
 *
 * Shared by the name-keyed pass and the map pass, because the fold is identical either
 * way: the floor is the worst member, the ceiling is the best, and the best is what the
 * bucket names as having set it. Only the *key* differs between the two, and the key is
 * the caller's business — which is the whole reason maps could stop being an `else if`
 * inside `flatBuckets` once their key stopped being their name.
 */
function collector(): {
  drafts: Map<string, Draft>;
  add: (
    id: string,
    family: BucketFamily,
    item: ItemData,
    conditions: readonly string[],
  ) => Draft;
} {
  const drafts = new Map<string, Draft>();

  // `conditions` is a parameter rather than something a call site assigns afterwards
  // because a bucket without them is a block that matches the whole floor. Taking them
  // here is what makes that unwritable. They are read on the first row only: every row
  // folding into one bucket is by definition matched by the same lines.
  const add = (
    id: string,
    family: BucketFamily,
    item: ItemData,
    conditions: readonly string[],
  ): Draft => {
    const draft = drafts.get(id);

    if (draft === undefined) {
      const seeded: Draft = {
        id,
        family,
        verb: "take",
        floor: price(item),
        ceiling: price(item),
        thin: isThin(item),
        members: 1,
        slots: item.width * item.height,
        note: "",
        conditions,
        minStack: 0,
        varies: HARD_TO_CATEGORIZE.has(withoutVariant(item.name)),
        minTier: "hidden",
        alwaysShow: false,
        vaalCeiling: 0,
        vaalFloor: 0,
        vaalName: "",
        vaalVariant: "",
        vaalMod: "",
        topName: item.name,
        topPrice: price(item),
        topVariant: "",
        // Everything reaching this pass is a scraped listing. What the exchange prices
        // never got here — `classify` took it out first.
        topFromExchange: false,
        examples: [`${item.name} ${Math.round(price(item))}c`],
      };

      drafts.set(id, seeded);
      return seeded;
    }

    draft.floor = Math.min(draft.floor, price(item));
    if (price(item) > draft.ceiling) {
      draft.ceiling = price(item);
      draft.topName = item.name;
      draft.topPrice = price(item);
    }
    draft.thin = draft.thin && isThin(item);
    draft.members += 1;
    if (draft.examples.length < 3) {
      draft.examples.push(`${item.name} ${Math.round(price(item))}c`);
    }

    return draft;
  };

  return { drafts, add };
}

/**
 * Everything whose bucket is just its name: gems, cards, stackables, and the long tail of
 * relics, corpses and blueprints.
 *
 * Gems collapse on name and corruption only. A filter can read gem level and quality and
 * the market splits hard on both, so this is the coarsest thing here and the next thing
 * to split.
 */
function flatBuckets(
  items: readonly ItemData[],
  gemKind: (name: string) => GemKind,
  exceptionalGems: readonly string[],
  transfiguredGems: readonly string[],
): Draft[] {
  const { drafts, add } = collector();

  for (const item of items) {
    if (ignored(item) || item.category === "bases") continue;
    // Maps are keyed on what the filter can read off the ground rather than on a name —
    // see `mapBuckets`.
    if (item.category === "maps") continue;
    // Uniques are bucketed by base, not by name — see `checkBuckets`.
    if (UNIQUE_CATEGORIES.has(item.category) && item.frame === 3) continue;

    if (item.category === "gem") {
      const kind = gemKind(item.name);

      // The event is the value, so there is nothing to price and nothing to split on.
      // One bucket per transfiguration, every level and quality in it.
      //
      // Corrupted rows are thrown out rather than folded in. A Divine Font cuts a gem
      // uncorrupted, so a corrupted transfiguration is one somebody vaaled afterwards and
      // is not a thing that reaches a floor — and it is not a harmless extra either. It
      // was setting the price: `Lightning Tendrils of Escalation` read 6,946c off a
      // level 21 quality 23 listing, which is a number no drop of it will ever be worth.
      if (kind === "transfigured") {
        if (item.gemIsCorrupted) continue;

        // **Not a BaseType.** GGG's catalog files `Ice Nova of Frostbolts` as base type
        // `Ice Nova` with the transfiguration as a discriminator, so `BaseType ==` on the
        // full name matches nothing and every one of these would be a block that cannot
        // fire. The grammar has the condition that reads the discriminator.
        add(`gem:${item.name}`, "gems", item, [
          formatCondition(`TransfiguredGem "${item.name}"`),
        ]).varies = true;
        continue;
      }

      // Priced where it drops and nowhere else — which for these is the only place they
      // ever are. An exceptional gem caps at level 3 or 4, so it has no 20/20 to be
      // priced at, and quality above 0 is somebody's investment rather than a drop.
      if (kind === "exceptional") {
        if (item.gemLevel !== DROP_LEVEL) continue;
        if (item.gemQuality !== DROP_QUALITY) continue;

        // The name alone, with no level or quality gate. The bucket is priced off the
        // level 1 quality 0 row because that is the only one that drops, but the block has
        // to take a level 4 corrupted Enlighten too — that is the one worth 2,480c, and
        // `GEM_LEVELS` is why it has no bucket of its own. See `TODO.md`.
        const draft = add(`gem:${item.name}`, "gems", item, [baseTypeIs(item.name)]);
        draft.alwaysShow = true;
        draft.minTier = EXCEPTIONAL_MIN_TIER;
        continue;
      }

      // A Trarthus gem is the one transfiguration-shaped item that drops rather than
      // being cut, so it is priced like a drop: where it lands, and nowhere else. The
      // levelled and corrupted ones it also trades at are what somebody did to it later.
      if (kind === "trarthus") {
        if (item.gemLevel !== DROP_LEVEL) continue;
        if (item.gemQuality !== DROP_QUALITY) continue;

        add(`gem:${item.name}`, "gems", item, [
          baseTypeIs(item.name),
        ]).alwaysShow = true;
        continue;
      }

      // What is left is every ordinary gem, active and support alike, and it earns a
      // block in one case: a corruption went past what levelling can reach. That is the
      // whole of what drops — 20/20 and under is a vendor purchase or a socket, and the
      // 2,000-odd buckets that used to sit there said nothing except that.
      if (!overCorrupted(item) && !isVaalGem(item.name)) continue;
      if (!GEM_LEVELS.has(item.gemLevel)) continue;
      if (!GEM_QUALITIES.has(item.gemQuality)) continue;

      const corrupted = item.gemIsCorrupted ? " corrupted" : "";
      // `>=` on both numbers rather than `==`. A level 21 gem is also over a level 20
      // block's bar, and showing it at the quieter tier is the show-cheap direction of
      // wrong; the loud block is written first and takes it before the quiet one is
      // reached. Quality 0 writes no line at all — every gem clears it.
      add(
        `gem:${item.name} lvl${item.gemLevel} q${item.gemQuality}${corrupted}`,
        "gems",
        item,
        [
          baseTypeIs(item.name),
          `GemLevel >= ${item.gemLevel}`,
          ...(item.gemQuality > DROP_QUALITY
            ? [`Quality >= ${item.gemQuality}`]
            : []),
          item.gemIsCorrupted ? "Corrupted True" : "Corrupted False",
        ],
      ).alwaysShow = true;
    } else {
      const base = withoutVariant(item.name);
      const { id, family } = placement(item.category, item.name);
      // `Class` only where the family is the class. A base type is unambiguous on its own
      // — the names carrying two classes are cosmetics that never drop and the
      // Invitations, which are one item filed twice — so everything else is the name.
      add(id, family, item, [
        ...(family === "div-cards" ? ['Class == "Divination Cards"'] : []),
        baseTypeIs(base),
      ]);
    }
  }

  // None of these three may be hidden, and a bucket that does not exist is one the filter
  // cannot show. A gem nobody listed in the state it drops in — 26 transfigurations traded
  // only corrupted this league, and corrupted ones are thrown out above — would otherwise
  // vanish for having a market rather than for lacking one.
  //
  // Seeded at no price, which is honest: there is no price. `varies` ignores it outright,
  // and the other two are floored by `minTier` rather than by the ladder.
  for (const name of [...exceptionalGems, ...transfiguredGems]) {
    const id = `gem:${name}`;
    if (drafts.has(id)) continue;

    const kind = gemKind(name);

    drafts.set(id, {
      id,
      family: "gems",
      verb: "take",
      floor: 0,
      ceiling: 0,
      // No listing behind it at all, which is the definition of thin.
      thin: true,
      members: 0,
      slots: 1,
      note: "",
      conditions:
        kind === "transfigured"
          ? [formatCondition(`TransfiguredGem "${name}"`)]
          : [baseTypeIs(name)],
      minStack: 0,
      varies: kind === "transfigured",
      minTier: kind === "exceptional" ? EXCEPTIONAL_MIN_TIER : "hidden",
      alwaysShow: true,
      vaalCeiling: 0,
      vaalFloor: 0,
      vaalName: "",
      vaalVariant: "",
      vaalMod: "",
      topName: name,
      topPrice: 0,
      topVariant: "",
      topFromExchange: false,
      examples: [],
    });
  }

  return [...drafts.values()];
}

/**
 * The map rows that are trade goods rather than drops, and so earn no block.
 *
 * Every one of these is bought, not found. A filter block for an item nothing puts on the
 * floor is a block that can never fire, and eleven of them at the top of the map section
 * is eleven chances to mis-order the ones that can.
 *
 * Kept as a name list because there is nothing in the payload to derive it from. PoeWatch
 * files these beside the maps that *do* drop, with the same category, the same tier and
 * the same shape — the only thing separating them is what the game does with them, which
 * no feed reports.
 */
const TRADED_MAPS = new Set([
  "Al-Hezmin's Map",
  "Baran's Map",
  "Drox's Map",
  "Shaper Guardian Map",
  "The Constrictor's Map",
  "The Enslaver's Map",
  "The Eradicator's Map",
  "The Purifier's Map",
  "Vaal Temple Map",
  "Veritania's Map",
]);

/** PoeWatch's name for a plain tier-16 map: 1.4 million listings of one nameless item. */
const CLEAN_T16 = "Map (Tier 16)";

const NIGHTMARE_MAP = "Nightmare Map";

/** PoeWatch prefixes the tier: `Blighted Map (Tier 16)`, `Blight-ravaged Map (Tier 16)`. */
const BLIGHTED_MAP = "Blighted Map";

const BLIGHT_RAVAGED_MAP = "Blight-ravaged Map";

/**
 * What a plain map block has to say to stop taking a blighted one.
 *
 * **Said outright rather than left to block order.** A blighted map is normal rarity at an
 * ordinary tier, so `MapTier 9` and `Rarity Normal` describe it perfectly and the plain
 * block would take it — and the two blocks carry the same number of conditions, which is
 * all the emitter sorts on. Both flags are written because nothing published says whether
 * a blight-ravaged map also answers `BlightedMap`, and a block that is right under either
 * reading is worth two lines.
 */
const NOT_BLIGHTED: readonly string[] = [
  "BlightedMap False",
  "UberBlightedMap False",
];

/**
 * The tier-16 maps no feed prices, what each block must say, and how loud it may go.
 *
 * **Corruption alone is not the thing worth seeing — eight modifiers is.** A map that was
 * corrupted and gained nothing is a plain t16 and is priced as one. So corrupted splits
 * three ways here, on the one axis the ground can be asked about: whether the modifiers
 * are readable, and whether there are eight of them.
 *
 * The count travels as `conditions` — verbatim filter lines — because the grammar has no
 * way to count an item's modifiers. `HasExplicitMod` takes a count and matches
 * substrings, so eight matches against the vowels is eight modifiers, every modifier name
 * containing at least one. `Identified True` guards it: identification is what makes
 * explicit modifiers readable, and without the guard the block silently never fires on a
 * fresh drop.
 *
 * **The blocks overlap, and the ladder is what separates them.** Their conditions nest:
 * `Corrupted True Identified True` matches everything the eight-modifier block matches,
 * and the plain Originator block matches every corrupted Originator map. So the emitter
 * must write the loud one first and let first-match-wins do the rest. That ordering falls
 * out of the tiers below rather than being arranged anywhere, which is worth knowing
 * before any of them is moved.
 *
 * **The Originator pair ignores identification, and therefore counts no modifiers.** See
 * `CORRUPTED`.
 *
 * `floor` is where the ladder may not go below: `rungs` counts up from wherever the plain
 * t16 landed, `tier` names an absolute. Relative is the better answer wherever the thing
 * is "worth more than a plain map" — it survives the plain map's price moving. Absolute is
 * for a bucket the player has decided about regardless of what anything costs.
 */
const EIGHT_MODS: readonly string[] = [
  "Corrupted True",
  "Identified True",
  'HasExplicitMod >=8 "a" "e" "i" "o" "u" "y"',
];

const CORRUPTED_IDENTIFIED: readonly string[] = [
  "Corrupted True",
  "Identified True",
];

/**
 * Corrupted, read or unread.
 *
 * **What the Originator blocks use, and the reason they do not count modifiers.** The
 * implicit is the whole reason one of those is loud, and an implicit stays legible on an
 * unidentified item — so gating on identification would drop half the drops for a
 * distinction that was never the point. Counting modifiers costs exactly that gate, since
 * `HasExplicitMod` cannot read an unidentified item, so the two go together: no
 * identification requirement, no eight-modifier count.
 */
const CORRUPTED: readonly string[] = ["Corrupted True"];

/**
 * What an Originator map can actually be asked about, and it is blunter than the item.
 *
 * The Originator's Memories is an *implicit*, so none of the explicit machinery reaches
 * it — no substring match, no count, no vowel trick. The grammar offers exactly one
 * general implicit condition, `HasImplicitMod True`, meaning *carries at least one*. It
 * cannot be told which implicit, and there is no name-matching form: the only two numeric
 * implicit conditions are `HasEaterOfWorldsImplicit` and `HasSearingExarchImplicit`, both
 * specific to those mechanics.
 *
 * **So this fires on any tier-16 map carrying any implicit**, which is the show-cheap
 * trade rather than an accident — the alternative is a bucket with no key at all. What
 * else lands in it is bounded and mostly worth seeing anyway: the Elder and Shaper
 * influence implicits, the occupied-by and Citadel ones, and whatever a corruption added.
 * See `TODO.md`.
 */
const ORIGINATOR: readonly string[] = ["HasImplicitMod True"];

/**
 * The same map before anybody read it, and the only honest thing left to say about one.
 *
 * A corrupted map can land unidentified, and identification is what makes explicit
 * modifiers readable — so the count in `EIGHT_MODS` cannot run and there is no way to ask
 * whether this is the eight-modifier map or an ordinary corrupted one. Both are on the
 * floor looking identical.
 *
 * Which is `check`, exactly as the verb is defined: the filter cannot tell which item this
 * is, and hovering is free. It is floored at the eight-modifier tier rather than the plain
 * one, which is the show-cheap rule doing its job — tier the bucket at its best outcome
 * when the filter cannot distinguish. **A placeholder, and deliberately the expensive
 * one.** See `TODO.md`.
 */
const UNIDENTIFIED: readonly string[] = ["Corrupted True", "Identified False"];

const T16_VARIANTS: readonly {
  id: string;
  label: string;
  note: string;
  conditions: readonly string[];
  verb: Verb;
  floor: { rungs: number } | { tier: Tier };
}[] = [
  {
    id: "map:t16 corrupted 8 mods",
    label: "Corrupted Map (Tier 16), 8 mods",
    // Absolute rather than relative, because this is not a claim about the market. It is
    // the player saying always pick one up, and a plain t16 going cheap must not quiet it.
    // The number it is actually worth is an open question — see `TODO.md`.
    note: "8 mods — always take, unpriced",
    conditions: EIGHT_MODS,
    verb: "take",
    floor: { tier: "T2" },
  },
  {
    id: "map:t16 corrupted unidentified",
    label: "Unidentified Corrupted Map (Tier 16)",
    note: "might be 8 mods — treated as one",
    conditions: UNIDENTIFIED,
    verb: "check",
    floor: { tier: "T2" },
  },
  {
    id: "map:t16 corrupted",
    label: "Corrupted Map (Tier 16)",
    // Nothing prices a corrupted map that gained no modifiers, and nothing needs to: it
    // is a plain t16 that has been vaaled, so it lands exactly where a plain t16 lands.
    note: "no 8-mod count — tiered as a plain t16",
    conditions: CORRUPTED_IDENTIFIED,
    verb: "take",
    floor: { rungs: 0 },
  },
  {
    id: "map:t16 originator",
    label: "Originator Map (Tier 16)",
    note: "any t16 carrying an implicit",
    conditions: ORIGINATOR,
    verb: "take",
    floor: { rungs: 1 },
  },
  {
    id: "map:t16 originator corrupted",
    label: "Corrupted Originator Map (Tier 16)",
    note: "any corrupted t16 carrying an implicit",
    conditions: [...CORRUPTED, ...ORIGINATOR],
    verb: "take",
    floor: { rungs: 2 },
  },
];

/**
 * Every map, keyed on what a filter can actually read off the ground.
 *
 * **Maps stopped dropping with names, and that is why they are no longer bucketed like
 * everything else.** The name rule that still works for gems and cards says nothing here:
 * `Map (Tier 16)` is one identity covering 1.4 million listings, and what separates one
 * t16 from the next — corruption, the Originator implicit — has no row in any feed and
 * has to be asserted instead.
 *
 * So this pass does three different things at once, and the order below is the whole
 * rule:
 *
 * 1. **Traded maps leave.** They do not drop. See `TRADED_MAPS`.
 * 2. **Unique maps are one `varies` bucket**, always shown, and the `hideUniqueMaps` lever
 *    deletes it. Nothing separates one from another — see the branch.
 * 3. **Tierless rows are not maps.** PoeWatch files invitations, reliquary keys and the
 *    Chronicles under `maps` for where they are used, and the absent tier is the only
 *    thing in the payload that tells them apart from one.
 * 4. **Tier 16 splits four ways**, three of them priced by nothing at all.
 * 5. **Blight and blight-ravaged are keyed on their own flag**, one bucket per tier. The
 *    game reads them and the market prices them apart — see `NOT_BLIGHTED`.
 * 6. **Everything else keeps the old tier-and-frame key** — tiers 1 to 15. Those still
 *    drop as one undifferentiated thing per tier and there is nothing new to say about
 *    them.
 */
function mapBuckets(
  items: readonly ItemData[],
  rates: Rates,
  levers: Levers,
): Draft[] {
  const { drafts, add } = collector();

  for (const item of items) {
    if (ignored(item) || item.category !== "maps") continue;
    if (TRADED_MAPS.has(item.name)) continue;

    if (item.frame === 3) {
      // All or nothing, because the game leaves no middle setting — see `hideUniqueMaps`.
      if (levers.hideUniqueMaps) continue;

      // One bucket for all of them, and no tier at all.
      //
      // **A unique map has no key.** Its base is the same nameless `Map (Tier N)` every
      // other map dropped from, and the filter has no condition that reads an item's
      // name — so `Replica Cortex` at 110c and `Death and Taxes` at 1c are one item as
      // far as a block can tell. Per-name buckets would be 25 blocks of which 24 could
      // never be written.
      //
      // `varies` rather than a tier off the best member, because tiering at 110c would
      // promise a payday on every white-tier junk map, and tiering lower would hide the
      // Cortex. The honest answer is that the ladder does not apply, which is the one
      // thing `varies` exists to say.
      // `check` is the verb's own definition — the filter cannot tell which item this
      // is — and it is what keeps `resolve` reporting both ends of the spread. A `take`
      // collapses floor onto ceiling, which would print 106c as the worst outcome of a
      // bucket whose worst outcome is 1c.
      // The whole class, because that is the whole of what a block can say about one.
      const draft = add("unique-map", "unique-maps", item, [
        "Rarity Unique",
        'Class == "Maps"',
      ]);
      draft.verb = "check";
      draft.varies = true;
      draft.alwaysShow = true;
      continue;
    }

    // Never hidden, whatever it is worth. A Polaric Invitation at 7c and a Cosmic
    // Reliquary Key at 2,388c are the same promise to the player: this category always
    // appears, and the cheap end gets a smaller mark rather than no mark.
    if (item.mapTier == null) {
      add(
        `fragment:${withoutVariant(item.name)}`,
        "fragments",
        item,
        [baseTypeIs(withoutVariant(item.name))],
      ).alwaysShow = true;
      continue;
    }

    if (item.name === NIGHTMARE_MAP) {
      // The id says `nightmare` and the base type says `Nightmare Map`. Reading the
      // first as the second is exactly the guess this field exists to stop.
      add("map:nightmare", "maps", item, [
        baseTypeIs(NIGHTMARE_MAP),
      ]).alwaysShow = true;
      continue;
    }

    // Blight and blight-ravaged leave before the tier-and-frame key, because they are a
    // different item at the same tier and rarity. A Blighted Map (Tier 1) is 15c against
    // 1c for the white t1 it was folded in with, and it was setting that bucket's tier —
    // paying out the blighted price on every plain map of the tier while the blighted one
    // had no block of its own. No rarity line: these drop white and can be alched, and
    // showing an alched one is the cheap direction of wrong.
    if (item.name.startsWith(BLIGHT_RAVAGED_MAP)) {
      add(`map:blight-ravaged tier${item.mapTier}`, "maps", item, [
        `MapTier ${item.mapTier}`,
        "UberBlightedMap True",
      ]);
      continue;
    }

    if (item.name.startsWith(BLIGHTED_MAP)) {
      add(`map:blighted tier${item.mapTier}`, "maps", item, [
        `MapTier ${item.mapTier}`,
        "BlightedMap True",
      ]);
      continue;
    }

    if (item.name === CLEAN_T16) {
      add("map:t16", "maps", item, ["MapTier 16", "Rarity Normal", ...NOT_BLIGHTED]);
      continue;
    }

    add(`map:tier${item.mapTier} frame${item.frame}`, "maps", item, [
      `MapTier ${item.mapTier}`,
      `Rarity ${RARITY_BY_FRAME[item.frame] ?? "Normal"}`,
      ...NOT_BLIGHTED,
    ]);
  }

  // The plain t16 is resolved here rather than left to `resolve`, because the three
  // variants are defined against where it lands and nothing else in this file can tell
  // them where that is. Same arithmetic `resolve` will redo for it a moment later: one
  // member, floor and ceiling agree, so the expected value is simply the price.
  const clean = drafts.get("map:t16");
  const cleanTier =
    clean === undefined
      ? // No plain t16 in the feed at all. Something is badly wrong upstream, and the
        // variants still drop — so they are floored off the quiet end rather than left
        // out, which shows them at the smallest mark instead of hiding them.
        "hidden"
      : tierFor(
          clean,
          Math.max(clean.floor, clean.ceiling),
          clean.ceiling,
          rates,
          levers,
        );

  for (const variant of T16_VARIANTS) {
    drafts.set(variant.id, {
      id: variant.id,
      family: "maps",
      verb: variant.verb,
      // Seeded at no price, which is honest: there is no price. The tier comes off
      // `minTier` alone, exactly as it does for a gem nobody has listed.
      floor: 0,
      ceiling: 0,
      thin: true,
      members: 0,
      slots: clean?.slots ?? 1,
      note: variant.note,
      // The tier is in the id and nowhere in the lines, so it is written here rather than
      // repeated in all five. `>=` because a t17 is a t16 as far as any of these go.
      conditions: ["MapTier >= 16", ...variant.conditions],
      minStack: 0,
      varies: false,
      minTier:
        "tier" in variant.floor
          ? variant.floor.tier
          : louder(cleanTier, variant.floor.rungs),
      alwaysShow: true,
      vaalCeiling: 0,
      vaalFloor: 0,
      vaalName: "",
      vaalVariant: "",
      vaalMod: "",
      topName: variant.label,
      topPrice: 0,
      topVariant: "",
      topFromExchange: false,
      examples: [],
    });
  }

  return [...drafts.values()];
}

/**
 * Which of the three gem rules a name falls under.
 *
 * Both lists come from the wiki, which is the only place either is published: GGG's data
 * has no gem tags, and nothing in a transfigured gem's own data says it is one.
 *
 * Anything on neither list is a `vendor` gem — the default, because that is what almost
 * every gem is and because a name the wiki has not heard of is far more likely to be a new
 * ordinary gem than a new Awakened one.
 *
 * The `Vaal ` prefix is tried as a fallback because the wiki files a Vaal gem as its own
 * item and never as a transfiguration, so `Vaal Ice Nova of Frostbolts` — 47 of them in
 * one league — is on no list under that name while `Ice Nova of Frostbolts` is. Stripping
 * only as a fallback is what keeps Vaal Impurity of Fire and Vaal Rain of Arrows where
 * they belong: their stripped names are on no list either, so they stay `vendor` — and
 * a Vaal gem is a corruption outcome, which is a branch of its own further down.
 */
function gemKinds(input: ClassifyInput): (name: string) => GemKind {
  const exceptional = new Set(input.exceptionalGems);
  const transfigured = new Set(input.transfiguredGems);

  const kind = (name: string): GemKind | undefined => {
    if (exceptional.has(name)) return "exceptional";
    // Checked inside the transfigured test rather than beside it: the wiki knows these
    // only as transfigurations, so the suffix is a split of that set, not a rival to it.
    if (transfigured.has(name)) {
      return name.endsWith(TRARTHUS_SUFFIX) ? "trarthus" : "transfigured";
    }
    return undefined;
  };

  return (name) => {
    const base = withoutVariant(name);
    return (
      kind(base) ??
      (base.startsWith("Vaal ") ? kind(base.slice("Vaal ".length)) : undefined) ??
      "vendor"
    );
  };
}

/**
 * Where the show-cheap baseline is actually spent.
 *
 * A bucket hides only when trusted data says it is worthless. Thin data cannot hide
 * anything — a bucket nobody has traded enough to price lands at T4, shown quietly,
 * because the alternative is hiding the one drop that turns out to matter.
 */
function tierFor(
  draft: Draft,
  ev: number,
  ceiling: number,
  rates: Rates,
  levers: Levers,
): Tier {
  // The cuts are in divine and everything measured here is in chaos, so the ladder is
  // converted rather than the prices. One multiplication against thousands of them.
  if (ceiling >= T0_CEILING * rates.divine) return "T0";

  // The click floor outranks the ladder, which is why it is tested before it rather than
  // after: a bucket clearing T4 on value can still be under what the player will bend
  // down for, and the player's answer is the one that counts. It sits *below* the T0
  // ceiling override on purpose — a lottery ticket is not what anyone means by this — and
  // an always-shown category still gets its smallest mark rather than none.
  if (ev < levers.minClickValue) return draft.alwaysShow ? "T5" : "hidden";

  for (const [tier, cut] of TIER_CUTS) if (ev >= cut * rates.divine) return tier;
  // A category the player asked to always see gets the smallest mark instead of none.
  if (draft.alwaysShow) return "T5";
  return draft.thin ? "T4" : "hidden";
}

/**
 * Decide the verb from the ratio, then the tier from the expected value of that verb's
 * action.
 *
 * Two numbers doing two jobs. `ceiling / floor` says what kind of decision this is;
 * `E[outcome]` says how much to care. Keeping them apart is what stops a lottery ticket
 * and a payday looking alike — a 1c ring worth 800c corrupted is a `gamble`, and it is
 * still not a T0.
 *
 * **The vaal side names the verb and touches nothing else.** It used to carry an
 * expectation — a hit rate against the corrupted ceiling, less the orb — that could raise
 * the tier on its own. That is gone. A corrupted ceiling now says only *this bucket is a
 * gamble*, and the tier stays whatever the plain price makes it, hidden included.
 *
 * Which is the point: tier and verb are composable and independent. The tier says how
 * this bucket reads on its own, the verb says what kind of decision it is, and how the two
 * combine on screen is decided where the filter is written — not here.
 */
function resolve(draft: Draft, rates: Rates, levers: Levers): Bucket {
  const ratio =
    draft.floor > 0
      ? draft.ceiling / draft.floor
      : draft.ceiling > 0
        ? Number.POSITIVE_INFINITY
        : 1;

  // Floor and ceiling agree, so there is nothing left to learn by hovering.
  //
  // A bucket nothing prices is exempt, and keeps whatever verb it declared. The test asks
  // whether this bucket's two ends disagree; with no price there are no ends, so it has
  // nothing to say and no business overruling a branch that already knows the filter
  // cannot identify what it matched.
  const identityVerb: Verb =
    draft.ceiling <= 0 || ratio > RATIO_THRESHOLD ? draft.verb : "take";

  const worth = Math.max(draft.floor, draft.ceiling);
  const plainEv =
    identityVerb === "check" ? draft.ceiling * CHECK_DISCOUNT : worth;

  // `gamble` is not "has vaal upside" — nearly everything has vaal upside. It is "the
  // vaal upside is the reason to touch this", and only the ratio says that. Demand
  // raising the plain price is what demotes a bucket back out of it.
  //
  // The loss cap is the second half, and it is absolute where the ratio is relative:
  // Kalandra's Touch is 525c plain against a 47,738c corrupted ceiling, which passes the
  // ratio at 91× and is still a ring almost nobody will actually destroy.
  const vaalable =
    draft.vaalCeiling > draft.vaalFloor * VAAL_GAMBLE_RATIO &&
    draft.vaalFloor <= MAX_GAMBLE_FLOOR;

  // A base that is already worth hovering stays a `check` and carries `vaalable` beside
  // it. Moonstone Ring is visible for Anathema whether or not anyone vaals Valyrium.
  const verb: Verb =
    identityVerb === "check" ? "check" : vaalable ? "gamble" : identityVerb;

  return {
    id: draft.id,
    family: draft.family,
    verb,
    // Plain price, plain ceiling. A Gilded Sallet worth 1c is tiered as a 1c item and
    // lands where a 1c item lands — the 20c corrupted outcome is carried by the verb.
    //
    // `varies` outranks all of it, the click floor included. There is no point running a
    // ladder over a number the filter will never see.
    tier: draft.varies
      ? "varies"
      : atLeast(
          tierFor(draft, plainEv, draft.ceiling, rates, levers),
          draft.minTier,
        ),
    // A `take` has nothing left to learn, so both ends are the one number.
    floor: identityVerb === "take" ? worth : draft.floor,
    ceiling: identityVerb === "take" ? worth : draft.ceiling,
    ratio,
    ev: plainEv,
    vaalable,
    vaalCeiling: draft.vaalCeiling,
    vaalFloor: draft.vaalFloor,
    thin: draft.thin,
    members: draft.members,
    slots: draft.slots,
    note: draft.note,
    conditions: draft.conditions,
    minStack: draft.minStack,
    // On a gamble, the corrupted outcome is the whole reason the bucket exists, so it is
    // what gets named — even though the plain price is what set the tier. Everywhere else
    // the two are the same member anyway.
    setBy: vaalable
      ? `${named(draft.vaalName, draft.vaalVariant)} corrupted ${chaos(draft.vaalCeiling)}${
          draft.vaalMod === "" ? "" : ` — ${draft.vaalMod}`
        }`
      : `${named(draft.topName, draft.topVariant)} ${chaos(draft.topPrice)}`,
    // False on a gamble, whatever the top member was priced by: a corrupted ceiling comes
    // from the corruption data, and the exchange prices nothing there. The flag describes
    // the number `setBy` prints, not the bucket in general.
    fromExchange: !vaalable && draft.topFromExchange,
    alwaysShow: draft.alwaysShow,
    examples: draft.examples,
  };
}

/**
 * Every stack size worth its own block for one item, smallest first.
 *
 * **The stack is the tier for anything that stacks.** A currency is one item at every
 * price the game will ever show it at; what changes is how many of it are on the ground.
 * So instead of one bucket carrying one tier, a stackable becomes a short ladder — the
 * smallest stack reaching each cut — and the filter picks the right rung with a
 * `StackSize >=` it can already read.
 *
 * **The click floor is a rung of its own, and the bottom of the ladder.** One click takes
 * the whole pile, so a floor on what a click is worth is a floor on the stack — at 3c a
 * Chaos Orb starts at `@3`, a rung no tier cut asked for, and everything under it goes.
 *
 * Failing that, `1` is the ladder, even when a single one is worth nothing. That bucket
 * resolves to `hidden` and says so, which is a different and more useful answer than the
 * item being absent from the classification.
 *
 * Rungs needing more than the item's stack ceiling are dropped rather than clamped.
 * Clamping would promote a pile of scrolls to T0 by putting the T0 label on a stack of
 * twenty. Dropping says the plain truth: that tier is not reachable by this item.
 */
function stackSteps(
  unit: number,
  cap: number,
  rates: Rates,
  levers: Levers,
  floor?: { readonly stack: number; readonly tier: Tier },
): number[] {
  // Where the ladder starts. One is the floor of the floor: a stack of zero is not a drop.
  const bottom = Math.max(1, Math.ceil(levers.minClickValue / unit));

  const steps = new Set<number>([bottom]);

  for (const [tier, cut] of TIER_CUTS) {
    // A hand floor replaces the rung it speaks for rather than sitting beside it. Both
    // would be the same tier, the quieter one written first would take every stack the
    // louder one wanted, and the louder one would be a block that cannot fire.
    if (tier === floor?.tier) continue;

    const needed = Math.ceil((cut * rates.divine) / unit);
    if (needed > bottom && needed <= cap) steps.add(needed);
  }

  if (floor !== undefined && floor.stack > bottom && floor.stack <= cap) {
    steps.add(floor.stack);
  }

  // A click floor no full stack can reach leaves the single item to answer for the
  // currency, and `tierFor` hides it — still classified, as never worth a click.
  if (bottom > cap) return [1];

  return [...steps].sort((left, right) => left - right);
}

/**
 * A bucket for every item the exchange prices — which, after `classify` has taken those
 * rows out of `/compact`, is the only place any of them appears.
 *
 * These carry no rarity, level or footprint: an exchange row is a name, a category and a
 * price. That is enough, because everything on that market is a 1×1 stackable or a card.
 *
 * Stacking categories get the ladder. Divination cards deliberately do not — a card's
 * value comes from completing a set, not from piling up, so a card is tiered at one card
 * and the set is somebody else's problem.
 */
function exchangeBuckets(
  exchange: readonly ExchangeRatioItem[],
  quotes: Map<number, number>,
  rates: Rates,
  levers: Levers,
): Draft[] {
  const drafts: Draft[] = [];

  for (const item of exchange) {
    const unit = quotes.get(item.id);
    if (unit === undefined) continue;

    const { id, family } = placement(item.category, item.name);
    const gated = stacks(item.category, item.name);

    const cap = maxStack(item.category, item.name);

    // Gold is the only item with a stack the player insists on seeing whatever it prices
    // at. Everything else earns every rung it gets.
    const floor = item.name === GOLD ? GOLD_FLOOR : undefined;

    for (const stack of gated
      ? stackSteps(unit, cap, rates, levers, floor)
      : [1]) {
      const worth = unit * stack;
      const label = stack === 1 ? item.name : `${item.name} ×${stack}`;

      drafts.push({
        // The threshold is in the id because it is what makes the block distinct. Two
        // rungs of one currency are two blocks, and a runtime editor has to tell them
        // apart by name alone.
        id: gated ? `${id}@${stack}` : id,
        family,
        verb: "take",
        floor: worth,
        ceiling: worth,
        thin: false,
        members: 1,
        slots: 1,
        note: gated ? `stack>=${stack}` : "",
        // The rung is the block. Two rungs of one currency are the same base type and
        // differ in this line alone, which is why the larger one has to be written first.
        conditions: [
          baseTypeIs(withoutVariant(item.name)),
          ...(gated ? [`StackSize >= ${stack}`] : []),
        ],
        minStack: gated ? stack : 0,
        varies: HARD_TO_CATEGORIZE.has(withoutVariant(item.name)),
        // Every rung at or above a hand floor inherits it. It only ever raises a tier, so
        // the rungs the arithmetic already made louder keep what they earned.
        minTier:
          floor !== undefined && stack >= floor.stack ? floor.tier : "hidden",
        alwaysShow: false,
        vaalCeiling: 0,
        vaalFloor: 0,
        vaalName: "",
        vaalVariant: "",
        vaalMod: "",
        topName: label,
        topPrice: worth,
        topVariant: "",
        topFromExchange: true,
        examples: [`${label} ${chaos(worth)}`],
      });
    }
  }

  return drafts;
}

/**
 * Every bucket the snapshot supports, richest first.
 *
 * `levers` is the player's half of the answer. It is taken here rather than read from a
 * constant because moving one is meant to change which blocks exist, not just how loud
 * they are — so the flow is set the lever, regenerate, rather than re-colour a finished
 * filter.
 */
export function classify(
  input: ClassifyInput,
  levers: Levers = DEFAULT_LEVERS,
): readonly Bucket[] {
  // Chaos is the unit the exchange quotes against, so it has no row of its own. Added
  // here rather than anywhere later, so it goes through the same ladder as every orb.
  const exchange = input.exchange.some((item) => item.name === CHAOS_ORB.name)
    ? input.exchange
    : [...input.exchange, CHAOS_ORB];

  const rates = marketRates(exchange);

  // Gold is added after the rates rather than beside chaos, because its price is derived
  // from the divine the rates just read. Nothing else in the file needs to know it is not
  // a market row.
  const priced = exchange.some((item) => item.name === GOLD)
    ? exchange
    : [...exchange, goldRow(rates, levers)];

  const quotes = exchangeQuotes(priced);

  // The exchange owns every id it prices, so those rows leave `/compact` here and reach
  // none of the passes below. One item, one entry, priced by the better book — rather
  // than a listing-priced entry and an exchange-priced one disagreeing in public.
  const items = input.items.filter((item) => !quotes.has(item.id));

  const ceilings = vaalCeilings(input.corruptions);
  const prices = uniquePrices(items, ceilings);

  // Three times over the uniques, once per overlay. Same rules, same ratio test, three
  // disjoint sets of buckets — a Foulborn drop and a Replica each come from somewhere
  // else and carry a flag the filter can read, so each gets its own block above the plain
  // one. Only Foulborn is always shown; a cheap replica is just a cheap item.
  return [
    ...uniqueBaseBuckets(input.uniques, prices, "plain"),
    ...uniqueBaseBuckets(input.uniques, prices, "foulborn"),
    ...uniqueBaseBuckets(input.uniques, prices, "replica"),
    ...baseBuckets(items),
    ...mapBuckets(items, rates, levers),
    ...flatBuckets(
      items,
      gemKinds(input),
      input.exceptionalGems,
      input.transfiguredGems,
    ),
    ...exchangeBuckets(priced, quotes, rates, levers),
  ]
    .map((draft) => resolve(draft, rates, levers))
    .sort((left, right) => right.ev - left.ev);
}
