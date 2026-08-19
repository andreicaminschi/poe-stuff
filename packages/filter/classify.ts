import type {
  ExchangeRatioItem,
  ItemCorruptions,
  ItemData,
} from "@poe/poe-watch/types";
import type { Bucket, BucketFamily, FilterUnique, Tier, Verb } from "./types.ts";

/**
 * Turn a market snapshot into buckets a filter block can be written from.
 *
 * The one rule everything else serves: **it is better to show a cheap item than to hide
 * an expensive one.** A wrongly shown item costs a click. A wrongly hidden one costs the
 * item, and costs the player's trust in the filter, which is worth more. So every guard
 * below is asymmetric on purpose — thin data never hides, an unknown restriction never
 * excludes, and a bucket is tiered on its best outcome rather than its likeliest.
 */

/** Chaos floors for each tier, richest first. Below the last one a bucket can hide. */
const TIER_CUTS: readonly (readonly [Tier, number])[] = [
  ["T0", 3000],
  ["T1", 300],
  ["T2", 40],
  ["T3", 5],
  ["T4", 1],
];

/**
 * `ceiling / floor` above which the floor is lying and the verb is no longer `take`.
 *
 * A generator constant, not a player lever. The player already owns the value thresholds;
 * a second knob here is how this grows into forty checkboxes.
 */
const RATIO_THRESHOLD = 10;

/**
 * A ceiling this high is T0 whatever the expected value says. The one deliberate
 * exception to tiering on expected value: a one-in-a-million drop is worth nothing on
 * average and still deserves to stop the map.
 */
const T0_CEILING = 20_000;

/** Rough odds a corruption lands the outcome worth having. Tunable, not measured. */
const VAAL_HIT_RATE = 0.05;

/** What the orb costs, in chaos. Subtracted from every `gamble` expectation. */
const VAAL_ORB_COST = 1;

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
 * gamble is still a 525c unique worth picking up, so the verb changes and the tier
 * recomputes on the plain price — which is what `tierWithoutVaal` already holds.
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
 * `trusted` holds the ids the Currency Exchange priced, and they are exempt. The floor
 * exists to disbelieve a scraped listing nobody acted on; an exchange row is a real book
 * with a real counterparty, where low volume means scarce rather than fabricated. Median
 * volume there is 3,566 against a floor built for numbers near 20, and the rows it would
 * cut are Mirror of Kalandra at 1, House of Mirrors at 1 and Hinekora's Lock at 3 — the
 * exact opposite of what the floor is for.
 */
const ignored = (item: ItemData, trusted: ReadonlySet<number>): boolean =>
  !trusted.has(item.id) && (listings(item) < MIN_DAILY_LISTINGS || isTroll(item));

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
 * Where a name-keyed item lands: its bucket id, and the family that id belongs to.
 *
 * One rule, used by both the compact pass and the exchange-only pass. An id is a block
 * marker a runtime editor looks up, so one category must never end up with two spellings
 * of it depending on which feed the price came from.
 */
function placement(
  category: string,
  name: string,
): { id: string; family: BucketFamily } {
  if (category === "card") return { id: `card:${name}`, family: "div-cards" };
  if (STACKABLE_CATEGORIES.has(category)) {
    return { id: `stack:${category}/${name}`, family: "stackables" };
  }
  return { id: `misc:${category}/${name}`, family: "misc" };
}

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
  /** Whether the row that set `plain` was priced by the exchange. */
  readonly fromExchange: boolean;
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

/** A price and its volume, in the shape the rest of this file expects. */
type Quote = { readonly price: number; readonly listings: number };

/**
 * What the exchange says about an item, keyed by the id `/compact` uses.
 *
 * **The exchange wins wherever it has an item.** It prices what actually changes hands on
 * the Currency Exchange — a real book with real volume — where `/compact` prices what
 * somebody put in a trade listing. For a Mirror of Kalandra those are not the same claim,
 * and only one of them is a price.
 *
 * `chaosValue` restates the chaos side in chaos and is what a bucket wants; `value` is the
 * same number for the chaos side, and the fallback for a row that omits it. `volume24H`
 * stands in for `daily`, since both count the last day.
 */
function exchangeQuotes(
  exchange: readonly ExchangeRatioItem[],
): Map<number, Quote> {
  const quotes = new Map<number, Quote>();

  for (const item of exchange) {
    const price = item.chaos.chaosValue ?? item.chaos.value;
    // A side that never traded comes back as zeroes rather than absent, and a zero is not
    // a price — leaving it out lets `/compact` answer for that item instead.
    if (price <= 0) continue;

    quotes.set(item.id, {
      price,
      listings: item.chaos.volume24H ?? item.chaos.volume,
    });
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
  trusted: ReadonlySet<number>,
): Map<string, UniquePrice> {
  const prices = new Map<string, UniquePrice>();

  for (const item of items) {
    if (item.frame !== 3 || ignored(item, trusted)) continue;
    if (!UNIQUE_CATEGORIES.has(item.category) && item.category !== "maps") {
      continue;
    }

    const { name, foulborn, variant } = identify(item.name);
    const key = priceKey(name, foulborn);
    const seen = prices.get(key);

    // Which row won is asked outright rather than taken from `Math.max`, on both sides:
    // the variant, the mod and `fromExchange` all belong to a row, and a maximum forgets
    // which row it came from.
    const plain = price(item);
    const beats = seen === undefined || plain > seen.plain;

    const ceiling = ceilings.get(item.id);
    const vaal = ceiling?.ceiling ?? 0;
    const vaalBeats = seen === undefined || vaal > seen.corrupted;

    prices.set(key, {
      plain: beats ? plain : seen.plain,
      corrupted: vaalBeats ? vaal : seen.corrupted,
      thin: (seen?.thin ?? true) && isThin(item),
      fromExchange: beats ? trusted.has(item.id) : seen.fromExchange,
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
      vaalName: best.corrupted > 0 ? best.name : "",
      vaalVariant: best.corrupted > 0 ? best.corruptedVariant : "",
      vaalMod: best.corrupted > 0 ? best.corruptedMod : "",
      topName: top.name,
      topPrice: top.plain,
      topVariant: top.variant,
      topFromExchange: top.fromExchange,
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
function baseBuckets(
  items: readonly ItemData[],
  trusted: ReadonlySet<number>,
): Draft[] {
  // A non-empty tuple: every group is created with its first row, and saying so is what
  // lets `rows[0]` stand for the footprint without a guard that can never fire.
  const groups = new Map<string, [ItemData, ...ItemData[]]>();

  for (const item of items) {
    if (item.category !== "bases" || ignored(item, trusted)) continue;

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
      alwaysShow: false,
      vaalCeiling: 0,
      vaalFloor: 0,
      vaalName: "",
      vaalVariant: "",
      vaalMod: "",
      topName: `ilvl ${topRow.itemLevel}`,
      topPrice: best,
      topVariant: "",
      topFromExchange: trusted.has(topRow.id),
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
function flatBuckets(
  items: readonly ItemData[],
  trusted: ReadonlySet<number>,
): Draft[] {
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
        alwaysShow: false,
        vaalCeiling: 0,
        vaalFloor: 0,
        vaalName: "",
        vaalVariant: "",
        vaalMod: "",
        topName: item.name,
        topPrice: price(item),
        topVariant: "",
        topFromExchange: trusted.has(item.id),
        examples: [`${item.name} ${Math.round(price(item))}c`],
      });
      return;
    }

    draft.floor = Math.min(draft.floor, price(item));
    if (price(item) > draft.ceiling) {
      draft.ceiling = price(item);
      draft.topName = item.name;
      draft.topPrice = price(item);
      draft.topFromExchange = trusted.has(item.id);
    }
    draft.thin = draft.thin && isThin(item);
    draft.members += 1;
    if (draft.examples.length < 3) {
      draft.examples.push(`${item.name} ${Math.round(price(item))}c`);
    }
  };

  for (const item of items) {
    if (ignored(item, trusted) || item.category === "bases") continue;
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
function tierFor(draft: Draft, ev: number, ceiling: number): Tier {
  if (ceiling >= T0_CEILING) return "T0";
  for (const [tier, cut] of TIER_CUTS) if (ev >= cut) return tier;
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
 * The vaal side is a third number that answers to a lever rather than to the market. It
 * can raise the tier and it can name the verb, and `tierWithoutVaal` records what is left
 * when the player switches it off — so a profile change moves tiers without re-pricing
 * anything.
 */
function resolve(draft: Draft): Bucket {
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

  const vaalEv = Math.max(
    0,
    draft.vaalCeiling * VAAL_HIT_RATE - VAAL_ORB_COST,
  );

  // `gamble` is not "has vaal upside" — nearly everything has vaal upside. It is "the
  // vaal upside is the reason to touch this", and only the ratio says that. Demand
  // raising the plain price is what demotes a bucket back out of it.
  //
  // The loss cap is the second half, and it is absolute where the ratio is relative:
  // Kalandra's Touch is 525c plain against a 47,738c corrupted ceiling, which passes the
  // ratio at 91× and is still a ring almost nobody will actually destroy.
  const vaalable =
    draft.vaalCeiling > draft.vaalFloor * RATIO_THRESHOLD &&
    draft.vaalFloor <= MAX_GAMBLE_FLOOR;

  // A base that is already worth hovering stays a `check` and carries `vaalable` beside
  // it. Moonstone Ring is visible for Anathema whether or not anyone vaals Valyrium.
  const verb: Verb =
    identityVerb === "check" ? "check" : vaalable ? "gamble" : identityVerb;

  const ev = vaalable ? Math.max(plainEv, vaalEv) : plainEv;

  // Which side set the tier. The T0 ceiling override skips the expected value entirely,
  // so a vaal ceiling over that line drives the tier even when its expectation does not.
  const drivenByVaal =
    vaalable &&
    (vaalEv > plainEv ||
      (draft.vaalCeiling > draft.ceiling && draft.vaalCeiling >= T0_CEILING));
  const ceiling = vaalable
    ? Math.max(draft.ceiling, draft.vaalCeiling)
    : draft.ceiling;

  return {
    id: draft.id,
    family: draft.family,
    verb,
    tier: tierFor(draft, ev, ceiling),
    tierWithoutVaal: tierFor(draft, plainEv, draft.ceiling),
    // A `take` has nothing left to learn, so both ends are the one number.
    floor: identityVerb === "take" ? worth : draft.floor,
    ceiling: identityVerb === "take" ? worth : draft.ceiling,
    ratio,
    ev,
    vaalable,
    vaalCeiling: draft.vaalCeiling,
    vaalFloor: draft.vaalFloor,
    vaalEv,
    thin: draft.thin,
    members: draft.members,
    slots: draft.slots,
    note: draft.note,
    setBy: drivenByVaal
      ? `${named(draft.vaalName, draft.vaalVariant)} corrupted ${chaos(draft.vaalCeiling)}${
          draft.vaalMod === "" ? "" : ` — ${draft.vaalMod}`
        }`
      : `${named(draft.topName, draft.topVariant)} ${chaos(draft.topPrice)}`,
    // False whenever the vaal drove the tier, whatever the top member was priced by: a
    // corrupted ceiling comes from the corruption data, and the exchange prices nothing
    // there. The flag describes the number `setBy` prints, not the bucket in general.
    fromExchange: !drivenByVaal && draft.topFromExchange,
    alwaysShow: draft.alwaysShow,
    examples: draft.examples,
  };
}

/**
 * Restate every row the exchange knows about at the exchange's price and volume.
 *
 * Done as a rewrite of the rows rather than a lookup at each use, so that nothing further
 * down has to remember which source it is holding — by the time a bucket is built, there
 * is one price per item and it came from the better book.
 */
function applyExchange(
  items: readonly ItemData[],
  quotes: Map<number, Quote>,
): readonly ItemData[] {
  return items.map((item) => {
    const quote = quotes.get(item.id);
    if (quote === undefined) return item;

    // `lowConfidence` is cleared with the price it described. The exchange has its own
    // flag and this row is no longer the row that carried the old one.
    return {
      ...item,
      mean: quote.price,
      daily: quote.listings,
      lowConfidence: false,
    };
  });
}

/**
 * Buckets for items the exchange prices and `/compact` never mentions.
 *
 * These carry no rarity, level or footprint — an exchange row is a name, a category and a
 * price. Enough for a stackable block, which is what everything on that market is.
 */
function exchangeOnlyBuckets(
  exchange: readonly ExchangeRatioItem[],
  quotes: Map<number, Quote>,
  known: ReadonlySet<number>,
): Draft[] {
  const drafts: Draft[] = [];

  for (const item of exchange) {
    if (known.has(item.id)) continue;
    const quote = quotes.get(item.id);
    if (quote === undefined) continue;

    const { id, family } = placement(item.category, item.name);

    drafts.push({
      id,
      family,
      verb: "take",
      floor: quote.price,
      ceiling: quote.price,
      thin: false,
      members: 1,
      slots: 1,
      note: "exchange only",
      alwaysShow: false,
      vaalCeiling: 0,
      vaalFloor: 0,
      vaalName: "",
      vaalVariant: "",
      vaalMod: "",
      topName: item.name,
      topPrice: quote.price,
      topVariant: "",
      topFromExchange: true,
      examples: [`${item.name} ${chaos(quote.price)}`],
    });
  }

  return drafts;
}

/** Every bucket the snapshot supports, richest first. */
export function classify(input: ClassifyInput): readonly Bucket[] {
  const quotes = exchangeQuotes(input.exchange);
  const items = applyExchange(input.items, quotes);

  // Every id the exchange priced. These bypass the scraped-listings floor.
  const trusted = new Set(quotes.keys());

  const ceilings = vaalCeilings(input.corruptions);
  const prices = uniquePrices(items, ceilings, trusted);

  // Twice over the uniques: the plain pass and the Foulborn one. Same rules, same ratio
  // test, separate buckets — a Foulborn drop comes from somewhere else and gets its own
  // section of the filter, always shown.
  return [
    ...uniqueBaseBuckets(input.uniques, prices, false),
    ...uniqueBaseBuckets(input.uniques, prices, true),
    ...baseBuckets(items, trusted),
    ...flatBuckets(items, trusted),
    ...exchangeOnlyBuckets(
      input.exchange,
      quotes,
      new Set(items.map((item) => item.id)),
    ),
  ]
    .map(resolve)
    .sort((left, right) => right.ev - left.ev);
}
