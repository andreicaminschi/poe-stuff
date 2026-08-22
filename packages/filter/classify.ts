import { formatCondition } from "@poe/filter-eval/format-note";
import type { ItemBase, StaticItem } from "@poe/ggg/types";
import type {
  ExchangeRatioItem,
  GemItem,
  ItemCorruptions,
  ItemData,
} from "@poe/poe-watch/types";
import hardToCategorize from "./hard-to-categorize.json" with { type: "json" };
import maxStacks from "./max-stacks.json" with { type: "json" };
import shards from "./shards.json" with { type: "json" };
import {
  FILE_LEVERS,
  LADDERS,
  LADDER_ROWS,
  LEAGUE_START,
  cutsFor,
  isPersistent,
  neverHidden,
  quietestRung,
  UNIQUE_CUTS,
} from "./tiers.ts";
import type { LadderName, TierRow } from "./tiers.ts";
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
 *
 * **This is the `default` ladder now, and it is on its way out.** `buckets/` gives currency,
 * gems, bases and uniques cuts of their own, and each of those will read its own rows out
 * of `tiers.json`. What is left here answers for the two families no doc covers yet — `misc`
 * and `replicas` — which is why the numbers are unchanged rather than re-tuned.
 */
const TIER_CUTS: readonly (readonly [Tier, number])[] = cutsFor(
  LADDERS.default,
);

/**
 * The ladder as a ranking, loudest first, with `hidden` as its quiet end.
 *
 * `varies` is deliberately absent: it is not on the ladder and nothing clamps against it.
 *
 * `T6` sits between `T5` and `hidden` now that the currency ladder puts buckets there. It
 * was left out while `louder` existed, because that function counted rungs backwards from
 * an index and a longer list silently moved every map tiered relative to another one.
 * `maps.md` replaced all of that with five asserted treatments, so nothing counts rungs any
 * more and the row is safe to add.
 */
const TIER_RANK: readonly Tier[] = [
  "T0",
  "T1",
  "T2",
  "T3",
  "T4",
  "T5",
  "T6",
  "hidden",
];

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
const withoutVariant = (name: string): string =>
  name.replace(/ \([^()]*\)$/, "");

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
/**
 * Items no stack size is known for, collected as they are met.
 *
 * **A stack ceiling that was guessed is a rung the filter may promise and the game can
 * never deliver.** `stackSteps` drops any rung needing more than the cap, so a default that
 * is too low silently deletes the loud blocks for a currency that really does pile up, and
 * one too high writes a `T0` block for a stack that cannot exist. Neither failure shows up
 * anywhere except in play, which is why the misses are named out loud instead of absorbed.
 *
 * Module-level because the lookup is called from three passes and threading a collector
 * through all of them would be plumbing for a diagnostic. Read and cleared by the CLI.
 */
const UNKNOWN_STACKS = new Set<string>();

/** Every item that fell through to the default stack size on this run. */
export const unknownStacks = (): readonly string[] =>
  [...UNKNOWN_STACKS].sort();

const maxStack = (category: string, name: string): number => {
  const known =
    MAX_STACK_BY_NAME.get(name) ??
    MAX_STACK_BY_NAME.get(withoutVariant(name)) ??
    MAX_STACK_BY_CATEGORY.get(category);

  if (known !== undefined) return known;

  UNKNOWN_STACKS.add(`${category}/${withoutVariant(name)}`);

  return maxStacks.default;
};

/**
 * What the player gets when they set nothing.
 *
 * A click floor of zero, because a lever nobody has touched must not be quietly hiding
 * items — the show-cheap baseline is the default, and this is what opts out of it.
 *
 * Read out of `tiers.json` rather than written here, so the numbers a player edits and the
 * numbers a caller gets for free are the same numbers. A default typed into the code as
 * well would be a second copy, and the two would disagree the first time one was changed.
 */
const DEFAULT_LEVERS: Levers = {
  minClickValue: FILE_LEVERS.minClickValue,
  hideUniqueMaps: FILE_LEVERS.hideUniqueMaps,
  goldPerDivine: FILE_LEVERS.goldPerDivine,
  gambleCeiling: FILE_LEVERS.gambleCeiling,
  gambleExclude: FILE_LEVERS.gambleExclude,
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

/**
 * What GGG says each item is, keyed by the name a price arrives under.
 *
 * **The join that makes GGG the source of truth rather than PoeWatch.** A `/compact` row
 * carries a name and a category, and only the name is worth anything: the category is
 * PoeWatch's own filing — `bases` lumps every white item together, `currency` holds
 * essences and oils and fossils — and none of it is what the game or the filter thinks.
 * GGG answers the two questions that actually decide a block:
 *
 * - `category` — the group `/data/items` puts a base type in: `armour`, `weapon`,
 *   `accessory`, `flask`, `tincture`, `jewel`, `gem`, `map`, `currency`, `card`. This is
 *   the word the docs in `buckets/` are written in.
 * - `staticGroup` — the group `/data/static` puts an exchange item in: `Currency`,
 *   `Fragments`, `Essences`, `Oils`, `Delve`. The kind of currency, which `/data/items`
 *   flattens away and nothing else publishes.
 * - `unique` — whether GGG's own unique list has an item under this name. The only
 *   honest test of whether a frame-3 row names a unique the game can drop.
 *
 * Base types collide across groups exactly once that matters: `Energy Blade` is a skill
 * gem and a weapon base. Every caller settles that before asking, by branching on the
 * row's frame first — a frame-4 row is a gem whatever this map last wrote for the name.
 * The other hundred collisions are numeric ids GGG lists under both `currency` and `map`,
 * and no priced row is ever named `10021`.
 */
type GggIndex = {
  /** The `/data/items` group for a base type, or `undefined` when GGG has no such base. */
  readonly categoryOf: (name: string) => string | undefined;
  /** The `/data/static` group for an exchange item, or `undefined`. */
  readonly staticGroupOf: (name: string) => string | undefined;
  /** Whether GGG lists a unique under this exact name. */
  readonly isUnique: (name: string) => boolean;
};

/**
 * Build the join, once per classification.
 *
 * Names are looked up variant-stripped and through `BASE_TYPE_RENAMES`, because that is
 * the only spelling both feeds agree on — PoeWatch writes `Scrying Orb (Basilica)` and
 * `Logbook (Black Scythe Mercenaries)` where the game has `Scrying Orb` and
 * `Expedition Logbook`.
 */
function gggIndex(
  itemBases: readonly ItemBase[],
  staticItems: readonly StaticItem[],
  uniques: readonly FilterUnique[],
): GggIndex {
  const categories = new Map<string, string>();
  for (const base of itemBases) categories.set(base.type, base.category);

  const groups = new Map<string, string>();
  for (const item of staticItems) groups.set(item.text, item.category);

  const uniqueNames = new Set(uniques.map((unique) => unique.name));

  return {
    categoryOf: (name) => categories.get(gameName(name)),
    staticGroupOf: (name) => groups.get(gameName(name)),
    isUnique: (name) => uniqueNames.has(name),
  };
}

/**
 * The GGG categories a white base may be classified from — every group `/data/items` files
 * a piece of equipment under.
 *
 * Wider than what `bases.md` asks for, and that is the point: this is what
 * `baseBuckets` *considers*, so it is also what `flatBuckets` must leave alone. A jewel
 * base that `bases.md` excludes is not thereby a stackable — it is an undocumented base,
 * and the honest answer is no block rather than a `misc:` one.
 */
const EQUIPMENT_CATEGORIES = new Set([
  "accessory",
  "armour",
  "flask",
  "heistequipment",
  "jewel",
  "tincture",
  "weapon",
]);

/**
 * The GGG categories `bases.md` includes, and the whole of what earns a base block.
 *
 * `jewel` and `heistequipment` are the two `EQUIPMENT_CATEGORIES` left out, which drops 213
 * of the 19,895 white rows PoeWatch prices. That is the doc's instruction, not an accident:
 * a jewel base is a 1×1 with no craftable spread and a heist brooch is bought, not found.
 */
const BASE_CATEGORIES = new Set([
  "accessory",
  "armour",
  "flask",
  "tincture",
  "weapon",
]);

/**
 * The `/data/static` groups `currency.md` calls currency.
 *
 * **GGG's own division of currency into its kinds, and the whole membership test.** It is
 * every group the endpoint publishes except `Cards`, which `divination-cards.md` owns.
 *
 * `Misc` is in the doc's list and absent here because GGG publishes it empty — zero
 * entries, so it names nothing and a line for it would be a line that never matches.
 *
 * **What this excludes is the point of it.** `/data/static` is the Currency Exchange's
 * stock list rather than a census of currency, and it names 327 of the 502 stackable rows
 * PoeWatch prices. The other 175 — Facetor's Lens, the Vials, every Scrying Orb, the heist
 * idols — are not currency by this definition and get no block. They are not lost: the
 * catch-all at the end of the file shows anything no block claimed, loudly.
 */
const CURRENCY_GROUPS = new Set([
  "Currency",
  "Fragments",
  "Ducats",
  "EnshroudingCrystals",
  "Keepers",
  "AllflameEmbers",
  "Runegrafts",
  "Ancestor",
  "Sanctum",
  "Heist",
  "Expedition",
  "DeliriumOrbs",
  "Catalysts",
  "Oils",
  "Delve",
  "Essences",
  "Beasts",
  "MapKey",
  "MapsSpecial",
  "MapsUnique",
  "Legacy",
]);

/** The one static group that is not currency. `divination-cards.md` owns it. */
const CARD_GROUP = "Cards";

/**
 * The two currencies this file injects because no feed will name them.
 *
 * Chaos is the unit the exchange quotes everything else against, so it has no pair and no
 * row; gold cannot be traded, so it has no market at all. Both are currency by any reading
 * — they are missing from the static list for reasons that have nothing to do with what
 * they are, and a membership test that reads that absence as an answer is reading noise.
 *
 * See `CHAOS_ORB` and `goldRow` for why each is injected in the first place.
 */
const INJECTED = new Set(["Chaos Orb", "Gold"]);

/** PoeWatch's frame for a white item, which is the only rarity a crafting base has. */
const NORMAL_FRAME = 0;

/** PoeWatch's frame for a unique. */
const UNIQUE_FRAME = 3;

/** PoeWatch's frame for a gem. Every one of its 9,241 gem rows carries it and nothing else does. */
const GEM_FRAME = 4;

/**
 * A gem, and the narrowing that lets `gemLevel` be read.
 *
 * **GGG is deliberately not asked here.** `Energy Blade` is a skill gem and a weapon base
 * under one name, so `/data/items` lists it twice and a base-type lookup answers with
 * whichever group it read last — 13 gem rows would come back as weapons. PoeWatch's own
 * category is exact on this one, and the frame is the second opinion that makes it safe:
 * the two agree on all 9,241 rows, and it is the category that carries the type.
 */
const isGem = (item: ItemData): item is GemItem =>
  item.category === "gem" && item.frame === GEM_FRAME;

/**
 * A white piece of equipment: the thing `baseBuckets` is about.
 *
 * **Shared between the pass that claims these and the pass that must not.** `flatBuckets`
 * files everything it is handed by name, so anything `baseBuckets` considers has to leave
 * there — including the jewel and heist-gear bases `bases.md` excludes. Those are not
 * stackables and not `misc:`; they are undocumented bases, and no block is the honest
 * answer until a doc says otherwise.
 */
const isWhiteBase = (item: ItemData, ggg: GggIndex): boolean =>
  item.frame === NORMAL_FRAME &&
  EQUIPMENT_CATEGORIES.has(ggg.categoryOf(item.name) ?? "");

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

/**
 * GGG categories that never lie on a floor, so no block can ever match one.
 *
 * `monster` is 224 of Einhar's beasts — Black Mórrigan, Farrul, a Craicic Croaker. They
 * are captured into a menagerie and traded from there, and the trade site searches them,
 * which is why GGG's item catalogue lists them at all. Nothing ever drops one.
 *
 * Left in, each becomes `BaseType == "Black Mórrigan"`, and the game stops parsing the
 * file at the first base type it does not have. Dropping a category is a stronger claim
 * than dropping a row, which is why it is a named list and not a condition inline.
 *
 * Read off GGG rather than PoeWatch now, which is the same 224 rows by a better route:
 * `monsters` was PoeWatch's word for them, and this is the game's.
 */
const NOT_ON_THE_FLOOR = new Set(["monster"]);

/**
 * Where PoeWatch and the game disagree about what a base type is called.
 *
 * PoeWatch names an Expedition Logbook `Logbook (Black Scythe Mercenaries)`. The bracket
 * comes off with every other variant — the filter cannot read a faction off the ground —
 * and what is left is `Logbook`, which is not a base type the game has. It is
 * `Expedition Logbook`.
 *
 * A rename rather than a special case, because there is nothing to reason about: two
 * feeds, one item, two spellings. Keyed on the variant-stripped name.
 */
const BASE_TYPE_RENAMES: Readonly<Record<string, string>> = {
  Logbook: "Expedition Logbook",
};

/**
 * A priced row's name, spelled the way the game spells it.
 *
 * The one place the two feeds are reconciled, and therefore the only key anything joins
 * on. Both steps are lossy on purpose: the bracket goes because a filter cannot read a
 * faction or an attunement off the ground, and the rename goes because two feeds calling
 * one item two things is not something to reason about at the call site.
 */
const gameName = (name: string): string => {
  const stripped = withoutVariant(name);
  return BASE_TYPE_RENAMES[stripped] ?? stripped;
};

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
const baseTypeIs = (name: string): string =>
  formatCondition(`BaseType == "${name}"`);

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
  ggg: GggIndex,
): { id: string; family: BucketFamily } | undefined {
  // The bracket goes first. A filter matches a base type, and `Scrying Orb (Basilica)` is
  // not one — the game puts a Scrying Orb on the floor and the block can read nothing
  // past that. Keeping the variants apart would write 87 blocks where 86 can never fire,
  // all of them matching the item the first one already caught.
  const base = withoutVariant(name);

  // The two rows this file injects, and the one place they have to be let through by
  // name. Neither is on the exchange and that is not an omission: chaos is the unit every
  // other price is quoted in, so it has no pair of its own, and gold cannot be traded at
  // all. Judged by the static list they would both vanish — and gold vanishing takes the
  // `goldPerDivine` lever with it and sends every pile to the catch-all.
  if (INJECTED.has(base))
    return { id: `stack:Currency/${base}`, family: "stackables" };

  const group = ggg.staticGroupOf(base);

  // Cards are a static group like any other and are deliberately not currency: they have
  // their own doc, their own family and a ladder that never counts a stack.
  if (group === CARD_GROUP) return { id: `card:${base}`, family: "div-cards" };

  // `currency.md` names the groups that are currency, and this is that list applied. An
  // item GGG's exchange does not name is not currency and gets no block here — see
  // `CURRENCY_GROUPS`.
  if (group !== undefined && CURRENCY_GROUPS.has(group)) {
    return { id: `stack:${group}/${base}`, family: "stackables" };
  }

  // PoeWatch still files a handful of things the exchange has never heard of. They are
  // not currency by the only definition this file now has, so they are left unclassified
  // rather than filed under a category invented for them.
  return undefined;
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

/** The orb each shard makes, and how many of it that takes. See `shards.json`. */
const SHARD_ORB = new Map<string, string>(Object.entries(shards.byName));
const SHARDS_PER_ORB = shards.per;

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
  /**
   * Which ladder this bucket is cut against.
   *
   * **One tier word, several ladders, and the family is not enough to pick one.** `T2`
   * means 0.1 divine of currency, 0.5 divine of base and 5 divine of unique on the check
   * branch — three different promises wearing one label — so the rung a bucket earns is
   * only meaningful beside the ladder it was measured on. `default` is the old single
   * ladder, kept for the families `buckets/` has no doc for yet.
   */
  ladder: LadderName;
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
   * The click floor may not hide this, whatever it is worth.
   *
   * **Weaker than `alwaysShow` and deliberately so.** `alwaysShow` floors a bucket onto the
   * quietest rung its ladder has, which is a promotion for something worth nothing. This
   * only removes the floor's veto: the bucket keeps the rung its own price earned and the
   * styling that rung gives it. A cheap scarab is drawn as a cheap scarab — it is simply
   * drawn. See `neverHidden` in `tiers.json`.
   */
  neverHidden: boolean;
  /**
   * The quietest this bucket may be tiered, whatever the price says. `"hidden"` is no
   * floor at all — the ladder decides on its own.
   *
   * `alwaysShow` is the same idea at its weakest setting and stays separate because it
   * also survives the click floor, which a tier floor does not need to.
   */
  minTier: Tier;
  /**
   * The price this bucket is judged against the gamble ceiling on, in chaos.
   *
   * The base's most expensive unique — what the player stands to destroy by vaaling
   * blind — and *not* the same number as `ceiling` once the exclusion lever is on. Heavy
   * Belt's ceiling is Mageblood; with expensive uniques excluded above 100c, the number
   * that matters is Siegebreaker at 40c. 0 on anything that is not a unique base.
   */
  gamblePrice: number;
  /**
   * Some unique on this base corrupts into something worth `VAAL_GAMBLE_RATIO` times what
   * it is. The half of the gamble test that is about the orb rather than the player.
   */
  gambleWorthy: boolean;
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
   * Every base type the trade site searches on, from GGG's `/data/items`, with the group
   * it arrived in.
   *
   * **This is what makes a base type a base type.** PoeWatch files a row under a category
   * of its own devising and names it whatever its scraper read; GGG says which of those
   * names the game actually puts on the floor, and what kind of thing it is. A row that
   * joins to nothing here is a row no block can safely be written from.
   */
  readonly itemBases: readonly ItemBase[];
  /**
   * Every item the exchange names rather than searches for by base type, from
   * `/data/static`, with the group it arrived in.
   *
   * The group is the whole reason to read it: it is GGG dividing currency into its kinds —
   * `Currency`, `Fragments`, `Essences`, `Oils` — which `/data/items` flattens into one
   * `currency` and PoeWatch splits along different lines again.
   */
  readonly staticItems: readonly StaticItem[];
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
    throw new Error(
      "no Divine Orb price on the exchange: every tier cut needs it",
    );
  }

  return { divine };
}

/**
 * What a shard is worth, taken from the orb it makes rather than from its own quote.
 *
 * **The exchange cannot price a shard and the shape of the book is why.** The chaos side
 * quotes in whole chaos, so a bulk shard trade is recorded at one chaos each — and with a
 * shard market that trades single digits a day, one such trade is the price. Alteration
 * Shard came back at `1c` on a volume of 1 against an Orb of Alteration at `0.12c`: 167×
 * its real worth, with the busiest currency pair in the game as the counter-example.
 *
 * **One rule, and it is traffic: a shard keeps its own price only if it traded at least as
 * much as its orb did.** Not `lowConfidence` — PoeWatch left that flag off Transmutation
 * Shard, quoted at `1c` against an orb at `0.005379c`, so the flag catches some of this
 * and misses the rest. Volume catches all of it, because the thing wrong with a shard
 * quote is always that too few trades set it.
 *
 * Nothing is expected to pass. A shard market is never busier than the orb market, so in
 * practice every shard is priced off its orb, and the test is what makes that a finding
 * rather than an assumption — the day a shard really does out-trade its orb, its own price
 * is the better one and this steps out of the way.
 *
 * The orb's volume has to be a real one, which is what keeps the injected Chaos Orb from
 * vouching for a Chaos Shard: its price is `1` by definition and its volume is `0`, and
 * *at least as much as the orb* is true of anything against a zero.
 *
 * Returns nothing for anything that is not a shard, for a shard whose orb the league does
 * not price, and for a shard that out-traded its orb. All three mean *use the row's own
 * price*, which is what the caller does.
 */
const shardPrice = (
  item: ExchangeRatioItem,
  byName: ReadonlyMap<string, ExchangeRatioItem>,
): number | undefined => {
  const name = SHARD_ORB.get(item.name);
  if (name === undefined) return undefined;

  const orb = byName.get(name);
  if (orb === undefined) return undefined;

  const traded = orb.chaos.volume;
  if (traded > 0 && item.chaos.volume >= traded) return undefined;

  const price = exchangePrice(orb);
  // An orb the league does not price cannot correct anything, so the shard keeps its own
  // quote rather than falling out of the filter entirely.
  return price > 0 ? price / SHARDS_PER_ORB : undefined;
};

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
  const byName = new Map(exchange.map((item) => [item.name, item]));
  const quotes = new Map<number, number>();

  for (const item of exchange) {
    // A side that never traded comes back as zeroes rather than absent, and a zero is not
    // a price — leaving it out lets `/compact` answer for that item instead.
    const price = shardPrice(item, byName) ?? exchangePrice(item);
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
 * Amulet` — are turned away by `isUnique` rather than left to join to nothing later.
 *
 * **GGG's unique list is the whole membership test now.** It used to be a set of PoeWatch
 * categories a unique price was allowed to arrive in, which was a guess about somebody
 * else's filing: a unique Relic came in under `sanctum`, a Tincture under `azmeri`, a Vaal
 * Aspect under `currency`, and every league adds a category the list has not heard of. The
 * question was never which drawer PoeWatch used — it was whether the game has a unique by
 * this name, and that is a list GGG publishes.
 */
function uniquePrices(
  items: readonly ItemData[],
  ceilings: Map<number, VaalCeiling>,
  ggg: GggIndex,
): Map<string, UniquePrice> {
  const prices = new Map<string, UniquePrice>();

  for (const item of items) {
    if (item.frame !== UNIQUE_FRAME || ignored(item)) continue;

    // Identify first, ask GGG second. The row is spelled `Unidentified Foulborn
    // Headhunter (Culling)` and the unique is called `Headhunter`; asking before the
    // prefixes and the roll come off would turn away every Foulborn price in the feed.
    const { name, foulborn, variant } = identify(item.name);
    if (!ggg.isUnique(name)) continue;

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
  levers: Levers,
): Draft[] {
  const foulborn = overlay === "foulborn";
  const replica = overlay === "replica";
  const byBase = new Map<string, FilterUnique[]>();

  for (const unique of uniques) {
    // A dropped replica reads `Replica True`, so the block carrying that line is written
    // above the plain one and takes it first. The plain bucket must therefore not be
    // priced off a member it will never see.
    if (isReplica(unique.name) !== replica) continue;
    const members = byBase.get(unique.baseType);
    if (members === undefined) byBase.set(unique.baseType, [unique]);
    else members.push(unique);
  }

  // **The restriction is dropped per base, not per unique, and only where it protects
  // something.** Excluding a restricted member stops a common base being priced off a
  // unique it cannot roll — a Viridian Jewel is never Impossible Escape. But on a base
  // where *every* unique is restricted there is no common drop to protect: excluding them
  // all left the base with nothing priced and no block at all, which hid Voices at 224,438c
  // and every Timeless jewel. Those items still land on the floor, and a filter that says
  // nothing about them is the one failure this classifier is built to avoid.
  //
  // The replica pass keeps every member for the reason it always did: the wiki marks 102 of
  // the 103 replicas restricted, and `Replica True` is on the block, so the block already
  // says which item it means.
  for (const [baseType, members] of byBase) {
    if (replica) continue;

    const droppable = members.filter((member) => !member.restrictedDrop);
    if (droppable.length > 0) byBase.set(baseType, droppable);
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
    const top = priced.reduce((left, right) =>
      right.plain > left.plain ? right : left,
    );
    const best = priced.reduce((left, right) =>
      right.corrupted > left.corrupted ? right : left,
    );

    // **The exclusion lever, and the only place a member is allowed to be ignored.**
    // Normally a base is worth its most expensive unique, which is what stops Heavy Belt
    // ever being a gamble: Mageblood shares it. A player who knows that and wants Bisco's
    // Leash marked anyway names a price above which a unique stops counting — the claim
    // being that they will recognise a Mageblood on the ground rather than vaal it by
    // accident. Off by default, because it is the one setting here that can lose an item.
    const counted = levers.gambleExclude.enabled
      ? priced.filter((member) => member.plain <= levers.gambleExclude.cutoff)
      : priced;

    // Every member is over the cutoff, so there is nothing cheap on this base at all and
    // no gamble to offer. Zero rather than `-Infinity`, which would read as free.
    const gamblePrice =
      counted.length === 0
        ? 0
        : Math.max(...counted.map((member) => member.plain));

    // **Per member, not against the base's ceiling.** The question is whether *some*
    // unique here is worth more corrupted than kept, and Anathema at 10c into something
    // far larger is that — measured against Anathema, not against Shavronne's Revelation
    // which happens to share the base and is not the item being vaaled.
    const gambleWorthy = counted.some(
      (member) =>
        member.plain > 0 && member.corrupted > member.plain * VAAL_GAMBLE_RATIO,
    );

    drafts.push({
      id:
        overlay === "plain"
          ? `unique:${baseType}`
          : `unique:${overlay}/${baseType}`,
      family: OVERLAY_FAMILY[overlay],
      // Replicas keep the old single ladder: they have no doc of their own, and the user
      // asked for nothing to be built for them yet. The plain and Foulborn passes run
      // `uniques.md`'s take-and-check pair.
      ladder: overlay === "replica" ? "default" : "uniques",
      verb: "check",
      floor: Math.min(...plain),
      ceiling: Math.max(...plain),
      gamblePrice,
      gambleWorthy,
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
      neverHidden: false,
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
 *
 * **Which rows are bases is GGG's answer, not PoeWatch's.** A white row is one the game
 * files under `accessory`, `armour`, `flask`, `weapon` or `tincture` — the five categories
 * `bases.md` names. PoeWatch's own `bases` category agrees on 19,682 of its 19,895 rows and
 * the 213 it adds are jewel and heist-gear bases the doc leaves out, so this is the doc's
 * list applied rather than a second opinion about what a base is.
 */
function baseBuckets(items: readonly ItemData[], ggg: GggIndex): Draft[] {
  // A non-empty tuple: every group is created with its first row, and saying so is what
  // lets `rows[0]` stand for the footprint without a guard that can never fire.
  const groups = new Map<string, [ItemData, ...ItemData[]]>();

  for (const item of items) {
    if (ignored(item)) continue;
    if (!isWhiteBase(item, ggg)) continue;
    if (!BASE_CATEGORIES.has(ggg.categoryOf(item.name) ?? "")) continue;

    // **The one place `bases.md` inverts the show-cheap baseline, and it says so
    // outright:** *for bases low confidence, thin and low volume means the price is
    // disqualified*. Everywhere else a thin price keeps its bucket at the bottom of the
    // ladder, because showing a cheap item costs a click and hiding a dear one costs the
    // item. A base is the exception because the thing being claimed is different — an ilvl
    // 86 base block is a promise that somebody will *buy* this, and two listings nobody
    // answered is not evidence of a buyer. The row is dropped rather than tiered low, so a
    // base whose every row is thin gets no block at all.
    if (isThin(item)) continue;

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
      ladder: "bases",
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
      neverHidden: false,
      gamblePrice: 0,
      gambleWorthy: false,
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
        // Overwritten by the caller that knows which ladder it is filing under.
        ladder: "default",
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
        // Set by the caller that knows the item's static group — `collector` is handed rows
        // and nothing else.
        neverHidden: false,
        gamblePrice: 0,
        gambleWorthy: false,
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
  ggg: GggIndex,
): Draft[] {
  const { drafts, add } = collector();

  for (const item of items) {
    if (ignored(item)) continue;
    // Every white piece of equipment belongs to `baseBuckets`, including the categories
    // `bases.md` leaves out — see `isWhiteBase`.
    if (isWhiteBase(item, ggg)) continue;
    // Maps are five asserted treatments and no per-name buckets at all — see `mapBuckets`.
    //
    // **A tierless `maps` row is not a map.** PoeWatch files Invitations, Reliquary Keys
    // and the Chronicles under `maps` for where they are *used*, and the absent tier is
    // the only thing in the payload that separates them from something that drops as one.
    // Those fall through to the name-keyed pass below, where the static list decides
    // whether they are currency — which is where `currency.md` puts `MapKey`,
    // `MapsSpecial` and `MapsUnique`.
    if (item.category === "maps" && item.mapTier != null) continue;
    if (item.category === "maps" && item.frame === UNIQUE_FRAME) continue;
    // Uniques are bucketed by base, not by name — see `uniqueBaseBuckets`. Every frame 3
    // leaves here: a unique's name is not a base type, PoeWatch never sends the base type
    // beside it, and a block keyed on the name is one the game refuses to parse. A unique
    // whose base nothing knows is better unclassified — the catch-all at the end of the
    // file still shows it, loudly.
    if (item.frame === UNIQUE_FRAME) continue;
    // Traded, and never on the floor. See `NOT_ON_THE_FLOOR`.
    if (NOT_ON_THE_FLOOR.has(ggg.categoryOf(item.name) ?? "")) continue;

    // Category and frame together, and GGG deliberately not consulted — see `isGem`.
    if (isGem(item)) {
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
        const transfigured = add(`gem:${item.name}`, "gems", item, [
          formatCondition(`TransfiguredGem "${item.name}"`),
        ]);
        transfigured.varies = true;
        transfigured.ladder = "gems";
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
        const draft = add(`gem:${item.name}`, "gems", item, [
          baseTypeIs(item.name),
        ]);
        draft.alwaysShow = true;
        draft.minTier = EXCEPTIONAL_MIN_TIER;
        draft.ladder = "gems";
        continue;
      }

      // A Trarthus gem is the one transfiguration-shaped item that drops rather than
      // being cut, so it is priced like a drop: where it lands, and nowhere else. The
      // levelled and corrupted ones it also trades at are what somebody did to it later.
      if (kind === "trarthus") {
        if (item.gemLevel !== DROP_LEVEL) continue;
        if (item.gemQuality !== DROP_QUALITY) continue;

        // Written like every other transfiguration, because GGG catalogues it as one:
        // `Blast Rain of Trarthus` is base type `Blast Rain` with a discriminator, exactly
        // as `Ice Nova of Frostbolts` is. Only the *pricing* differs — this one drops — and
        // a `BaseType ==` on the full name is a base type the game does not have, which
        // stops it parsing the file rather than quietly matching nothing.
        const trarthus = add(`gem:${item.name}`, "gems", item, [
          formatCondition(`TransfiguredGem "${item.name}"`),
        ]);
        trarthus.alwaysShow = true;
        trarthus.ladder = "gems";
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
      const overRolled = add(
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
      );
      overRolled.alwaysShow = true;
      overRolled.ladder = "gems";
    } else {
      const base = gameName(item.name);
      const placed = placement(item.category, item.name, ggg);
      // Not currency and not a card, so nothing here claims it. The catch-all at the end
      // of the filter still shows it — see `CURRENCY_GROUPS`.
      if (placed === undefined) continue;

      // `Class` only where the family is the class. A base type is unambiguous on its own
      // — the names carrying two classes are cosmetics that never drop and the
      // Invitations, which are one item filed twice — so everything else is the name.
      const flat = add(placed.id, placed.family, item, [
        ...(placed.family === "div-cards"
          ? ['Class == "Divination Cards"']
          : []),
        baseTypeIs(base),
      ]);
      // Cards run the currency ladder too — `divination-cards.md` says so, and differs
      // only in never counting a stack.
      flat.ladder = "currency";
      // Scarabs and allflames answer to no click floor. Assigned rather than or-ed: every
      // row folding into one bucket shares a name, so they all give the same answer.
      flat.neverHidden = neverHidden(base, ggg.staticGroupOf(item.name));
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
      ladder: "gems",
      verb: "take",
      floor: 0,
      ceiling: 0,
      // No listing behind it at all, which is the definition of thin.
      thin: true,
      members: 0,
      slots: 1,
      note: "",
      conditions:
        // Both transfiguration shapes, for the reason the emitting branch above gives:
        // the game knows the base gem and the discriminator, never the joined name.
        kind === "transfigured" || kind === "trarthus"
          ? [formatCondition(`TransfiguredGem "${name}"`)]
          : [baseTypeIs(name)],
      minStack: 0,
      varies: kind === "transfigured",
      minTier: kind === "exceptional" ? EXCEPTIONAL_MIN_TIER : "hidden",
      alwaysShow: true,
      neverHidden: false,
      gamblePrice: 0,
      gambleWorthy: false,
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
 * The eight-modifier count, done the only way the grammar allows.
 *
 * There is no condition that counts an item's modifiers, so this leans on the fact that
 * every modifier name in the game contains a vowel: eight or more explicit mods matching
 * `a e i o u y` is eight or more explicit mods. A trick rather than a property, which is
 * why it travels to the emitter as a literal line and nothing downstream tries to rebuild
 * it from a structure.
 *
 * `Class == "Maps"` beside it because the count alone is not a map claim. A rare with a
 * long enough mod list answers this too, and the block that takes it is a map block.
 */
const EIGHT_MODS: readonly string[] = [
  'Class == "Maps"',
  'HasExplicitMod >=8 "a" "e" "i" "o" "u" "y"',
];

/**
 * Any map carrying an implicit, which on a map is what an Originator does to it.
 *
 * *On a map.* Off one, an implicit is what most of the game's gear has — so the class is
 * half of this condition, not decoration on it. Without it the block claims every ring,
 * every shield, every base with a line above the separator.
 */
const ORIGINATOR: readonly string[] = [
  'Class == "Maps"',
  "HasImplicitMod True",
];

/** The one map the game gives a name of its own, and so the one a base type can read. */
const NIGHTMARE_MAP = "Nightmare Map";

/**
 * The whole of what a filter has to say about a map.
 *
 * **`maps.md` prices nothing, and that is the change.** Every earlier version of this pass
 * tiered maps off a market — one bucket per tier per rarity, blighted split from plain, the
 * t16 variants pinned relative to whatever a plain t16 was worth that afternoon. None of it
 * survived contact with the question the doc actually asks, which is not *what is this map
 * worth* but *what kind of map is this*. A map is run, not sold; the thing worth marking is
 * the one carrying eight modifiers, and no feed prices that.
 *
 * So there are five treatments and no ladder. The order here is the order they are written
 * in, and it is load-bearing: the three loud ones say more about an item than `Rarity
 * Normal` does, and a plain-map block written above them would take an eight-mod map first.
 *
 * `MapTier` appears nowhere on purpose. `maps.md` says *all normal maps no matter the
 * tier*, and a tier condition is exactly the per-tier bucketing the doc replaced.
 */
const MAP_TREATMENTS: readonly {
  readonly treatment: string;
  readonly id: string;
  readonly label: string;
  readonly note: string;
  readonly tier: Tier;
  readonly conditions: readonly string[];
  readonly unique: boolean;
}[] = [
  {
    treatment: "eight-mod",
    id: "map:8-mod",
    label: "Map with eight modifiers",
    note: "eight explicit modifiers",
    tier: "T0",
    conditions: EIGHT_MODS,
    unique: false,
  },
  {
    treatment: "nightmare",
    id: "map:nightmare",
    label: NIGHTMARE_MAP,
    note: "the one map with a base type of its own",
    tier: "T1",
    conditions: [baseTypeIs(NIGHTMARE_MAP)],
    unique: false,
  },
  {
    treatment: "originator",
    id: "map:originator",
    label: "Originator Map",
    note: "any map carrying an implicit",
    tier: "T2",
    conditions: ORIGINATOR,
    unique: false,
  },
  {
    // Still one block for all of them, and for the reason it always was: a unique map's
    // base is the same nameless `Map (Tier N)` every other map dropped from, and no
    // condition reads an item's name. `Replica Cortex` and `Death and Taxes` are one item
    // as far as a block can tell.
    treatment: "unique",
    id: "map:unique",
    label: "Unique map",
    note: "every unique map, which is as far as a block can see",
    tier: "T3",
    conditions: ["Rarity Unique", 'Class == "Maps"'],
    unique: true,
  },
  {
    treatment: "normal",
    id: "map:normal",
    label: "Map",
    note: "every map of every tier",
    tier: "T4",
    conditions: ['Class == "Maps"'],
    unique: false,
  },
];

/**
 * The five map blocks, asserted rather than priced.
 *
 * No `items` argument, because nothing in the market feed changes any of this. That is the
 * point of the rewrite: the answer to *how should a map be drawn* comes out of `maps.md`
 * and `tiers.json`, and a price would only be able to contradict it.
 *
 * The tier is carried on `minTier` with `alwaysShow` beside it, which is how a bucket with
 * no price reaches a rung at all — the same way an unlisted gem does. Nothing here can be
 * hidden by the click floor, which is `maps.md` marking four of the five persistent and
 * the fifth being a unique the player asked to see.
 */
function mapBuckets(levers: Levers): Draft[] {
  return MAP_TREATMENTS.flatMap((treatment) => {
    // All or nothing, because the game leaves no middle setting — see `hideUniqueMaps`.
    if (treatment.unique && levers.hideUniqueMaps) return [];

    const draft: Draft = {
      id: treatment.id,
      family: treatment.unique ? "unique-maps" : "maps",
      // Maps are not cut against anything. The ladder only supplies the quiet end that
      // `minTier` then raises, and `default` is the one every unpriced bucket uses.
      ladder: "default",
      verb: "take",
      // Seeded at no price, which is honest: there is no price, and asking for one was the
      // mistake this pass exists to undo.
      floor: 0,
      ceiling: 0,
      thin: true,
      members: 0,
      slots: 1,
      note: treatment.note,
      conditions: treatment.conditions,
      minStack: 0,
      varies: false,
      minTier: treatment.tier,
      alwaysShow: true,
      neverHidden: false,
      gamblePrice: 0,
      gambleWorthy: false,
      vaalCeiling: 0,
      vaalFloor: 0,
      vaalName: "",
      vaalVariant: "",
      vaalMod: "",
      topName: treatment.label,
      topPrice: 0,
      topVariant: "",
      topFromExchange: false,
      examples: [],
    };

    return [draft];
  });
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
      (base.startsWith("Vaal ")
        ? kind(base.slice("Vaal ".length))
        : undefined) ??
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
  const quietest = quietestRung(draft.ladder);

  // The lottery-ticket override, and only on the ladder that has no doc of its own. The
  // four documented ladders state their cuts outright — bases `T0` is a quality condition
  // and currency `T0` is five divine — so an override that promotes on ceiling alone would
  // be a rule contradicting the file it is supposed to implement.
  if (draft.ladder === "default" && ceiling >= T0_CEILING * rates.divine) {
    return "T0";
  }

  // The cuts are in divine and everything measured here is in chaos, so the ladder is
  // converted rather than the prices. One multiplication against thousands of them.
  for (const row of LADDER_ROWS[draft.ladder]) {
    // The rung the player's own floor defines. It sits below every priced cut on its
    // ladder, so reaching it means nothing dearer claimed the bucket and the only question
    // left is whether the player would bend down for it at all.
    if (row.clickFloor) {
      // `neverHidden` keeps the rung rather than raising one — see the field. It is checked
      // beside the floor rather than after it because this *is* the floor's exception.
      if (ev >= levers.minClickValue || draft.neverHidden) return row.tier;
      return draft.alwaysShow ? quietest : "hidden";
    }

    if (row.cut == null) continue;
    if (ev < row.cut * rates.divine) continue;

    // **The click floor is tested here rather than before the ladder, and that is the
    // whole of what `persistent` means.** A rung the file marks persistent is one no
    // ground-floor rule may take away: on league start a divine is 60c, so a 5c floor
    // would erase the entire T3 band at 3c and the player would have been told the
    // third-loudest tier in the filter does not exist. Everything else still answers to
    // the floor, because nobody else can price the player's time.
    if (row.persistent || ev >= levers.minClickValue) return row.tier;

    return draft.alwaysShow ? quietest : "hidden";
  }

  if (ev < levers.minClickValue && !draft.alwaysShow) return "hidden";
  // A category the player asked to always see gets the smallest mark instead of none.
  if (draft.alwaysShow) return quietest;

  // A thin price is not evidence of a cheap item, so it keeps the bucket at the bottom of
  // the ladder rather than dropping it. Bases are the exception and settle it earlier —
  // `bases.md` disqualifies a thin price outright, so those rows never reach here.
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
/** The rungs a gamble may sit on. `uniques.md` offers one on the check branch only. */
const GAMBLE_TIERS: ReadonlySet<Tier> = new Set<Tier>(["T3", "T4"]);

/**
 * The loudest rung a set of cuts gives a price, or `undefined` when it clears none.
 *
 * The cuts are in divine and the price is in chaos, so the ladder is converted rather than
 * the price — one multiplication per rung instead of one per bucket.
 */
const rungFor = (
  rows: readonly TierRow[],
  value: number,
  rates: Rates,
): TierRow | undefined =>
  rows.find(
    (row) =>
      row.cut != null &&
      value >= row.cut * (row.unit === "chaos" ? 1 : rates.divine),
  );

/**
 * A unique base, measured twice against one ladder.
 *
 * **One set of cuts, read against two prices.** `take` is the *guaranteed* value — the
 * cheapest unique on the base, what the player is certain to get. `check` is the
 * *aspirational* value — the dearest, what the base could turn out to be. Both are run down
 * the same rungs, and the answer is the comparison between them:
 *
 * - **They agree** → that rung, verb `take`. Every unique on this base is worth the same
 *   sort of money, so there is nothing left to learn by hovering.
 * - **They differ** → still the *take* rung, verb `check`. The base could be worth more
 *   than it is guaranteed to be, and that is worth marking — but it is not worth showing
 *   the item as though the good outcome had already happened.
 *
 * **The aspirational value never raises the tier, and that is the point.** It used to: a
 * base whose cheapest unique was 100c and whose dearest was 2,042c was drawn at the
 * dearest, so a Ghastly Eye Jewel worth 100c arrived with the whoosh and the white
 * background reserved for a five-divine drop. The loudness a filter spends is a promise
 * about what is on the ground, and the only thing actually on the ground is the guaranteed
 * value. So the rung comes off the floor, and the upside is carried by the verb — which
 * the styler draws as a gold border, a larger label and a yellow star, over whatever the take
 * rung already looked like.
 *
 * **The last rung has a cut like every other, and a base under it earns nothing.** It used
 * to catch everything, which made `T4` the answer to *any price at all* — a 1c unique drew
 * a block, and 362 of the 563 priced bases sat on the quietest rung the file has. `T4` is
 * meant to be a drop worth bending down for, so it is `0.05` divine like the rungs above it
 * are `0.1` and `0.25`, and what fails it is hidden.
 *
 * That is not the old failure it looks like. The old design ran *two* ladders whose bottom
 * rungs were a factor of ten apart — a take bottoming at 10c and a check at 102c — so 72
 * bases fell between the two and vanished with nothing having decided they should. Here one
 * ladder is asked twice and a base is hidden by a cut it was actually measured against.
 *
 * **A base whose guarantee fails the ladder but whose upside clears it is a check at `T4`.**
 * Heavy Belt is guaranteed 1c and might be Mageblood; Leather Belt might be Headhunter. The
 * aspirational value still does not raise the tier — `T4` is the floor of the ladder, not a
 * rung the ceiling won — but it does decide the base is worth drawing at all, which is the
 * whole of what a check says.
 */
function uniqueRung(
  draft: Draft,
  rates: Rates,
):
  | { tier: Tier; upTo: Tier; branch: "take" | "check"; ev: number }
  | undefined {
  const last = UNIQUE_CUTS[UNIQUE_CUTS.length - 1];
  if (last === undefined) return undefined;

  // A base nothing priced has no floor and no ceiling to measure, so it earns nothing —
  // unlike a base priced at a penny, which is measured and found wanting.
  if (draft.members === 0) return undefined;

  const take = rungFor(UNIQUE_CUTS, draft.floor, rates);
  const check = rungFor(UNIQUE_CUTS, draft.ceiling, rates);

  // Neither price reached the bottom cut. Nothing on this base is worth the floor and
  // nothing on it might be, so there is no rung and `resolve` hides it.
  if (check === undefined) return undefined;

  // The guarantee cleared nothing and the upside cleared something: the quietest rung the
  // ladder has, as a check. `last` rather than `check.tier` — the ceiling says *look*, it
  // does not say *how loud*.
  if (take === undefined) {
    return {
      tier: last.tier,
      upTo: check.tier,
      branch: "check",
      ev: draft.ceiling * CHECK_DISCOUNT,
    };
  }

  // The tier is the take rung either way — the check rung never decides how loud the block
  // is. It is carried out as `upTo` because the styler wants it for one thing only: the
  // beam, which scales with the *upside* rather than the guarantee. See `styleFor`.
  return take.tier === check.tier
    ? { tier: take.tier, upTo: take.tier, branch: "take", ev: draft.floor }
    : {
        tier: take.tier,
        upTo: check.tier,
        branch: "check",
        ev: draft.ceiling * CHECK_DISCOUNT,
      };
}

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

  // The dual ladder, and the one place a bucket is measured twice.
  //
  // **`onUniqueLadder` and `unique` are different questions and both are needed.** The
  // first says which rules apply; the second says what they returned, and `undefined` from
  // it is a real answer — a base too cheap for either branch. Collapsing the two lets a
  // base that cleared nothing fall through to the rules it is not governed by, which is
  // how a hidden Carved Wand came out labelled `gamble`.
  const onUniqueLadder = draft.ladder === "uniques";
  const unique = onUniqueLadder ? uniqueRung(draft, rates) : undefined;

  const plainEv =
    unique !== undefined
      ? unique.ev
      : onUniqueLadder || identityVerb === "check"
        ? draft.ceiling * CHECK_DISCOUNT
        : worth;

  // `gamble` is not "has vaal upside" — nearly everything has vaal upside. It is "the
  // vaal upside is the reason to touch this".
  //
  // **`uniques.md` rewrote what that means, and it is now three tests rather than two.**
  // The base must be one the filter could not identify anyway (the check branch won), it
  // must be quiet enough that a blind vaal is plausible (`T3` or `T4`), and it must be
  // cheap enough that the player said they would spend it. The old absolute loss cap is
  // gone: `gambleCeiling` is the player's own number and does the same job better.
  // **A gamble is a base cheap enough to destroy that pays out when destroyed, and the
  // rung it earned is not part of that test.** `uniques.md` says gambles *apply to t3 and
  // t4*, and reading that as a cut the base must clear makes the feature unreachable: the
  // check branch reaches `T4` at half a divine, while the gamble ceiling caps the base at
  // a handful of chaos, so no base could ever satisfy both. The doc's own worked examples
  // settle it — Anathema at 10c and Bisco's Leash at 10c are the cases it was written for,
  // and neither clears a check cut. So `T3`/`T4` is where a gamble is *drawn*, and what it
  // rules out is a base already loud on its own merits: nothing at `T2` or above needs to
  // be sold as a lottery ticket.
  const tooLoudToGamble =
    unique !== undefined &&
    TIER_RANK.indexOf(unique.tier) < TIER_RANK.indexOf("T3");

  const vaalable = onUniqueLadder
    ? !tooLoudToGamble &&
      draft.gambleWorthy &&
      draft.gamblePrice > 0 &&
      draft.gamblePrice <= levers.gambleCeiling
    : draft.vaalCeiling > draft.vaalFloor * VAAL_GAMBLE_RATIO &&
      draft.vaalFloor <= MAX_GAMBLE_FLOOR;

  /**
   * Where a gamble is drawn when its own price earned it nothing.
   *
   * The corrupted outcome is the entire reason the block exists, so a base that cleared no
   * cut still has to appear — at the quiet end, which is what `T3`/`T4` means here.
   */
  const gambleTier: Tier =
    unique !== undefined && GAMBLE_TIERS.has(unique.tier) ? unique.tier : "T4";

  /**
   * The player's click floor, applied to a rung the unique ladder handed back.
   *
   * **`persistent` is the source of truth and this is the only thing that can be told
   * otherwise.** Every rung on the unique ladder carries the flag today, so nothing here
   * changes a single tier — which is the point. The floor has to be *wired* for the flag to
   * mean anything, or a rung added later without it would be just as immune as the ones
   * that earned the exemption, and the file would be claiming a rule it does not run.
   *
   * The cuts are quoted in divine and the floor in chaos, and that disagreement is settled
   * here rather than reconciled: a persistent rung keeps its tier at any floor the player
   * sets, and a rung that wants the floor to bite is a rung that drops the flag.
   *
   * `hidden` and `varies` are not rungs and pass through untouched — there is nothing left
   * to hide, and nothing measured to hide it by.
   */
  const floored = (tier: Tier): Tier => {
    if (tier === "hidden" || tier === "varies") return tier;
    if (isPersistent("uniques", tier)) return tier;
    if (plainEv >= levers.minClickValue) return tier;

    return draft.alwaysShow ? quietestRung("uniques") : "hidden";
  };

  // On a unique base the branch that won names the verb: a take is the claim that
  // everything on this base is worth it, a check that one of them might be. A base that
  // cleared neither is a `check` it will never show — the tier hides it — and saying so
  // is more honest than calling it a take. Elsewhere a base already worth hovering stays a
  // `check` and carries `vaalable` beside it.
  const verb: Verb = onUniqueLadder
    ? vaalable
      ? "gamble"
      : (unique?.branch ?? "check")
    : identityVerb === "check"
      ? "check"
      : vaalable
        ? "gamble"
        : identityVerb;

  // Plain price, plain ceiling. A Gilded Sallet worth 1c is tiered as a 1c item and lands
  // where a 1c item lands — the 20c corrupted outcome is carried by the verb.
  //
  // `varies` outranks all of it, the click floor included. There is no point running a
  // ladder over a number the filter will never see.
  //
  // A unique base that cleared neither branch has no rung, and the ordinary ladder has no
  // business inventing one for it — its cuts are the take cuts, which this base has already
  // failed. It hides, unless the overlay asked to always be seen.
  const resolved: Tier = draft.varies
    ? "varies"
    : atLeast(
        onUniqueLadder
          ? floored(
              vaalable
                ? gambleTier
                : (unique?.tier ??
                    (draft.alwaysShow ? quietestRung("uniques") : "hidden")),
            )
          : tierFor(draft, plainEv, draft.ceiling, rates, levers),
        draft.minTier,
      );

  return {
    id: draft.id,
    family: draft.family,
    verb,
    tier: resolved,
    // The rung this could turn out to be, which only differs on a unique check. The styler
    // reads it for the beam and nothing else — see `upTo` on `Bucket`.
    upTo: unique?.upTo ?? resolved,
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
 * **The click floor is a rung of its own, but never the bottom one.** One click takes the
 * whole pile, so a floor on what a click is worth is a floor on the stack — at 3c a Chaos
 * Orb starts at `@3`, a rung no tier cut asked for. What is under it still needs a block
 * to go into.
 *
 * **`1` is always the bottom of the ladder, even when a single one is worth nothing.** It
 * resolves to `hidden` and says so, which is a different and far more useful answer than
 * the item being absent from the classification — absent means no block claims a stack of
 * two Orbs of Unmaking, and what catches it is the magenta block that means the generator
 * is broken. The floor hides; it does not shout. Items on `neverHidden` keep their own
 * tier at this rung instead, which is that list doing its job at the size it matters most.
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
  ladder: LadderName,
  floor?: { readonly stack: number; readonly tier: Tier },
): number[] {
  // Where the paying rungs start. One is the floor of the floor: a stack of zero is not a
  // drop.
  const bottom = Math.max(1, Math.ceil(levers.minClickValue / unit));

  // `1` beside it, always, and it is the rung the click floor hides. Written after the
  // paying rungs — the emitter orders a shared shape by its threshold — so it takes only
  // the stacks none of them wanted.
  const steps = new Set<number>([1, bottom]);

  // **The bucket's own ladder, not the default one.** A rung is only worth a block if the
  // cut that grades the bucket actually falls on it, and the two came from different
  // ladders until this was passed in: the rungs were built from the default cuts while
  // `tierFor` graded against the currency cuts, so a stack of six chaos got a block and a
  // stack of eleven — the first that clears currency T3 — did not.
  for (const [tier, cut] of cutsFor(LADDER_ROWS[ladder])) {
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
  ggg: GggIndex,
): Draft[] {
  const drafts: Draft[] = [];

  for (const item of exchange) {
    const unit = quotes.get(item.id);
    if (unit === undefined) continue;

    const placed = placement(item.category, item.name, ggg);
    // An exchange row the static list does not name. Chaos Orb and Gold are injected
    // rather than fetched, so both are here — and both are named by GGG, which is what
    // keeps this from quietly dropping the unit the whole ladder is denominated in.
    if (placed === undefined) continue;

    const { id, family } = placed;
    const gated = stacks(item.category, item.name);

    const cap = maxStack(item.category, item.name);

    // Gold is the only item with a stack the player insists on seeing whatever it prices
    // at. Everything else earns every rung it gets.
    const floor = item.name === GOLD ? GOLD_FLOOR : undefined;

    for (const stack of gated
      ? stackSteps(unit, cap, rates, levers, "currency", floor)
      : [1]) {
      const worth = unit * stack;
      const label = stack === 1 ? item.name : `${item.name} ×${stack}`;

      drafts.push({
        // The threshold is in the id because it is what makes the block distinct. Two
        // rungs of one currency are two blocks, and a runtime editor has to tell them
        // apart by name alone.
        id: gated ? `${id}@${stack}` : id,
        family,
        // Currency and divination cards share one ladder — `divination-cards.md` says so
        // outright, and differs only in never counting a stack.
        ladder: "currency",
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
        neverHidden: neverHidden(
          withoutVariant(item.name),
          ggg.staticGroupOf(item.name),
        ),
        gamblePrice: 0,
        gambleWorthy: false,
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
 * The leaguestart rungs: the crafting mats worth seeing while there is nothing better.
 *
 * **The two rungs on the currency ladder that are not won on price, because at league
 * start price is the wrong question.** An Orb of Alteration is worth a fraction of a chaos
 * and a fresh character still wants every one of them — so `currency.md` names them
 * outright and gates the block on `AreaLevel`, which is the one thing the filter can read
 * that stands in for "how far along is this character".
 *
 * **A currency that earns a rung on price does not get one of these.** That is the doc's
 * own rule — *if a currency from this list becomes eligible to move higher on tiers then
 * it will be removed from this list* — and it falls out of asking for the priced tier
 * first: an Alchemy Orb that has climbed to `T3` is loud everywhere, not quiet above
 * level 68. Only the ones the ladder hides get a block here.
 *
 * Written at stack 1 with no `StackSize` line. The point is to see the single orb on the
 * floor, and a stack rung would be a quieter block that a louder one already answers for.
 */
/**
 * A bucket with no price behind it, asserted onto a rung.
 *
 * Four rules in `buckets/` name a rung directly instead of earning one — the two
 * leaguestart currency lists, the 30-quality base and the 10-quality gem. None of them is
 * a market claim and none can be derived from a feed, so all four are built the same way:
 * seeded at no price, floored onto the rung by `minTier`, and kept out of the click floor's
 * reach by `alwaysShow`.
 */
const assertedBucket = (fields: {
  readonly id: string;
  readonly family: BucketFamily;
  readonly ladder: LadderName;
  readonly tier: Tier;
  readonly note: string;
  readonly conditions: readonly string[];
  readonly label: string;
}): Draft => ({
  id: fields.id,
  family: fields.family,
  ladder: fields.ladder,
  verb: "take",
  floor: 0,
  ceiling: 0,
  thin: true,
  members: 0,
  slots: 1,
  note: fields.note,
  conditions: fields.conditions,
  minStack: 0,
  varies: false,
  minTier: fields.tier,
  alwaysShow: true,
  neverHidden: false,
  gamblePrice: 0,
  gambleWorthy: false,
  vaalCeiling: 0,
  vaalFloor: 0,
  vaalName: "",
  vaalVariant: "",
  vaalMod: "",
  topName: fields.label,
  topPrice: 0,
  topVariant: "",
  topFromExchange: false,
  examples: [],
});

/**
 * The two rules that are about quality rather than price.
 *
 * `bases.md` makes any 30-quality white item the top of the base ladder, and `gems.md`
 * makes any 10-quality gem the leaguestart rung. Neither is a market statement — 30 is
 * simply the most quality an item can carry, and a 10-quality gem is one somebody will
 * want early — so neither has a cut and both are asserted.
 *
 * The base block excludes maps by class. A 30% quality map is a real thing and it is not a
 * crafting base; without the line it would out-specify `maps.md`'s own block and be drawn
 * as the loudest base in the file.
 */
function qualityBuckets(): Draft[] {
  return [
    assertedBucket({
      id: "base:quality30",
      family: "bases",
      ladder: "bases",
      tier: "T0",
      note: `the most quality an item can carry`,
      conditions: [
        "Rarity Normal",
        `Quality >= ${LEAGUE_START.baseQuality}`,
        formatCondition('Class != "Maps"'),
      ],
      label: `any ${LEAGUE_START.baseQuality}% quality base`,
    }),
    assertedBucket({
      id: "gem:quality10",
      family: "gems",
      ladder: "gems",
      tier: "T5",
      note: `leaguestart, area level under ${LEAGUE_START.untilAreaLevel}`,
      conditions: [
        formatCondition('Class "Gems"'),
        `Quality >= ${LEAGUE_START.gemQuality}`,
        `AreaLevel < ${LEAGUE_START.untilAreaLevel}`,
      ],
      label: `any ${LEAGUE_START.gemQuality}% quality gem`,
    }),
  ];
}

function leagueStartBuckets(
  priced: ReadonlyMap<string, Tier>,
  ggg: GggIndex,
): Draft[] {
  const drafts: Draft[] = [];
  const rungs: readonly (readonly [Tier, readonly string[]])[] = [
    ["T5", LEAGUE_START.currency.T5],
    ["T6", LEAGUE_START.currency.T6],
  ];

  for (const [tier, names] of rungs) {
    for (const name of names) {
      // Already loud on its own merits, so the doc takes it off the list.
      if ((priced.get(name) ?? "hidden") !== "hidden") continue;

      // A name the game does not have is a typo in `tiers.json`, and a `BaseType` the game
      // refuses stops it reading the rest of the file. Better no block than that.
      if (ggg.categoryOf(name) === undefined) continue;

      drafts.push({
        id: `leaguestart:${name}`,
        family: "stackables",
        ladder: "currency",
        verb: "take",
        floor: 0,
        ceiling: 0,
        thin: true,
        members: 0,
        slots: 1,
        note: `leaguestart, area level under ${LEAGUE_START.untilAreaLevel}`,
        conditions: [
          baseTypeIs(name),
          `AreaLevel < ${LEAGUE_START.untilAreaLevel}`,
        ],
        minStack: 0,
        varies: false,
        // The rung is the whole point of the bucket, so it is asserted rather than earned.
        // `alwaysShow` is what stops the click floor taking it away.
        minTier: tier,
        alwaysShow: true,
        neverHidden: false,
        gamblePrice: 0,
        gambleWorthy: false,
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
  }

  return drafts;
}

/**
 * Priced rows that would be written as a base type the game does not have.
 *
 * **The one failure the GGG join can still produce, and it is fatal rather than untidy.**
 * A name-keyed bucket becomes `BaseType == "…"`, and the game stops parsing the file at
 * the first base type it does not recognise — so the filter does not lose one block, it
 * loses every block below it. Silence about that is the worst possible reporting.
 *
 * Only the rows that would actually reach a `BaseType ==` line are counted. Uniques are
 * bucketed by base and never by name; gems the game catalogues as a transfiguration are
 * written with `TransfiguredGem` and are not base types at all, which is why frame 4 is
 * exempt and why 2,294 unjoined transfiguration rows are not an error.
 *
 * Returned rather than logged, because deciding what to do about it is a caller's business
 * and this file writes nothing to a console.
 */
export function unjoinedNames(
  input: ClassifyInput,
): readonly { readonly name: string; readonly category: string }[] {
  const ggg = gggIndex(input.itemBases, input.staticItems, input.uniques);
  const seen = new Set<string>();
  const rows: { name: string; category: string }[] = [];

  for (const item of input.items) {
    if (
      ignored(item) ||
      item.frame === UNIQUE_FRAME ||
      item.frame === GEM_FRAME
    ) {
      continue;
    }
    if (isWhiteBase(item, ggg)) continue;
    if (item.category === "maps") continue;

    const name = gameName(item.name);
    if (ggg.categoryOf(name) !== undefined) continue;
    if (seen.has(name)) continue;

    seen.add(name);
    rows.push({ name, category: item.category });
  }

  return rows;
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

  // Built once and handed to every pass. It is the answer to "what is this", and asking
  // it is the first thing each pass does.
  const ggg = gggIndex(input.itemBases, input.staticItems, input.uniques);

  const ceilings = vaalCeilings(input.corruptions);
  const prices = uniquePrices(items, ceilings, ggg);

  // Three times over the uniques, once per overlay. Same rules, same ratio test, three
  // disjoint sets of buckets — a Foulborn drop and a Replica each come from somewhere
  // else and carry a flag the filter can read, so each gets its own block above the plain
  // one. Only Foulborn is always shown; a cheap replica is just a cheap item.
  const earned = [
    ...uniqueBaseBuckets(input.uniques, prices, "plain", levers),
    ...uniqueBaseBuckets(input.uniques, prices, "foulborn", levers),
    ...uniqueBaseBuckets(input.uniques, prices, "replica", levers),
    ...baseBuckets(items, ggg),
    ...mapBuckets(levers),
    ...flatBuckets(
      items,
      gemKinds(input),
      input.exceptionalGems,
      input.transfiguredGems,
      ggg,
    ),
    ...exchangeBuckets(priced, quotes, rates, levers, ggg),
    ...qualityBuckets(),
  ].map((draft) => resolve(draft, rates, levers));

  // The loudest rung each currency reached on price, which is what decides whether it is
  // still a leaguestart item. Resolved first because the question is about the answer,
  // not the inputs — see `leagueStartBuckets`.
  const loudest = new Map<string, Tier>();
  for (const bucket of earned) {
    if (bucket.family !== "stackables") continue;

    const name =
      bucket.id.slice(bucket.id.indexOf("/") + 1).split("@")[0] ?? "";
    const seen = loudest.get(name);
    if (
      seen === undefined ||
      TIER_RANK.indexOf(bucket.tier) < TIER_RANK.indexOf(seen)
    ) {
      loudest.set(name, bucket.tier);
    }
  }

  return [
    ...earned,
    ...leagueStartBuckets(loudest, ggg).map((draft) =>
      resolve(draft, rates, levers),
    ),
  ].sort((left, right) => right.ev - left.ev);
}
