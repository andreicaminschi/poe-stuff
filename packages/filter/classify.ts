import type {
  ExchangeRatioItem,
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
const DEFAULT_LEVERS: Levers = { minClickValue: 0 };

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
  /** Smallest stack that reaches this bucket. 0 on everything a stack does not gate. */
  minStack: number;
  /** The base type hides a spread the filter cannot read. Forces the `varies` tier. */
  varies: boolean;
  alwaysShow: boolean;
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
 */
function uniqueBaseBuckets(
  uniques: readonly FilterUnique[],
  prices: Map<string, UniquePrice>,
  foulborn: boolean,
): Draft[] {
  const byBase = new Map<string, FilterUnique[]>();

  for (const unique of uniques) {
    if (unique.restrictedDrop) continue;
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
      id: foulborn ? `unique:foulborn/${baseType}` : `unique:${baseType}`,
      family: foulborn ? "foulborn" : "uniques-by-base",
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
      minStack: 0,
      // A unique base is exactly what the filter can read, so nothing here is unknowable.
      varies: false,
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
      minStack: 0,
      varies: false,
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
 * Everything whose bucket is just its name: gems, cards, maps, stackables, and the long
 * tail of relics, corpses and blueprints.
 *
 * Gems collapse on name and corruption only. A filter can read gem level and quality and
 * the market splits hard on both, so this is the coarsest thing here and the next thing
 * to split.
 */
function flatBuckets(items: readonly ItemData[]): Draft[] {
  const drafts = new Map<string, Draft>();

  const add = (id: string, family: BucketFamily, item: ItemData): void => {
    const draft = drafts.get(id);

    if (draft === undefined) {
      drafts.set(id, {
        id,
        family,
        verb: "take",
        floor: price(item),
        ceiling: price(item),
        thin: isThin(item),
        members: 1,
        slots: item.width * item.height,
        note: "",
        minStack: 0,
        varies: HARD_TO_CATEGORIZE.has(withoutVariant(item.name)),
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
      });
      return;
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
  };

  for (const item of items) {
    if (ignored(item) || item.category === "bases") continue;
    // Uniques are bucketed by base, not by name — see `checkBuckets`.
    if (UNIQUE_CATEGORIES.has(item.category) && item.frame === 3) continue;

    if (item.category === "gem") {
      // Level and quality are in the key because a filter can read both, and the market
      // splits hard on them. Collapsing them is what let one bad row set the tier for
      // every Enlighten Support on the floor.
      if (!GEM_LEVELS.has(item.gemLevel)) continue;
      if (!GEM_QUALITIES.has(item.gemQuality)) continue;

      const corrupted = item.gemIsCorrupted ? " corrupted" : "";
      add(
        `gem:${item.name} lvl${item.gemLevel} q${item.gemQuality}${corrupted}`,
        "gems",
        item,
      );
    } else if (item.category === "maps") {
      if (item.frame === 3) {
        add(`unique-map:${identify(item.name).name}`, "unique-maps", item);
      } else {
        add(`map:tier${item.mapTier ?? "?"} frame${item.frame}`, "maps", item);
      }
    } else {
      const { id, family } = placement(item.category, item.name);
      add(id, family, item);
    }
  }

  return [...drafts.values()];
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
  const identityVerb: Verb = ratio > RATIO_THRESHOLD ? draft.verb : "take";

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
      : tierFor(draft, plainEv, draft.ceiling, rates, levers),
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
): number[] {
  // Where the ladder starts. One is the floor of the floor: a stack of zero is not a drop.
  const bottom = Math.max(1, Math.ceil(levers.minClickValue / unit));

  const steps = new Set<number>([bottom]);

  for (const [, cut] of TIER_CUTS) {
    const needed = Math.ceil((cut * rates.divine) / unit);
    if (needed > bottom && needed <= cap) steps.add(needed);
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

    for (const stack of gated ? stackSteps(unit, cap, rates, levers) : [1]) {
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
        minStack: gated ? stack : 0,
        varies: HARD_TO_CATEGORIZE.has(withoutVariant(item.name)),
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
  const quotes = exchangeQuotes(exchange);

  // The exchange owns every id it prices, so those rows leave `/compact` here and reach
  // none of the passes below. One item, one entry, priced by the better book — rather
  // than a listing-priced entry and an exchange-priced one disagreeing in public.
  const items = input.items.filter((item) => !quotes.has(item.id));

  const ceilings = vaalCeilings(input.corruptions);
  const prices = uniquePrices(items, ceilings);

  // Twice over the uniques: the plain pass and the Foulborn one. Same rules, same ratio
  // test, separate buckets — a Foulborn drop comes from somewhere else and gets its own
  // section of the filter, always shown.
  return [
    ...uniqueBaseBuckets(input.uniques, prices, false),
    ...uniqueBaseBuckets(input.uniques, prices, true),
    ...baseBuckets(items),
    ...flatBuckets(items),
    ...exchangeBuckets(exchange, quotes, rates, levers),
  ]
    .map((draft) => resolve(draft, rates, levers))
    .sort((left, right) => right.ev - left.ev);
}
