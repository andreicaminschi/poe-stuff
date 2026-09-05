import type {
  Condition,
  PriceSelector,
  TaxonomyVariant,
} from "@poe/taxonomy/get-taxonomy.types";

/** A taxonomy variant, with the Chaos mean of the listing its selector picked. */
export type PricedVariant = TaxonomyVariant & {
  readonly meanPrice?: number;
  /** PoeWatch's own flag on that listing: a small sample or high variance stands behind it. */
  readonly lowConfidence?: boolean;
};

/**
 * Which bronze file put something on a row.
 *
 * `authored` is the odd one and reads as the exception it is: no source produced the row,
 * somebody wrote it by hand in the taxonomy's `<version>.authored.json`, and it reached
 * bronze inside the published taxonomy.
 */
export type ItemSource =
  | "items"
  | "exchange"
  | "repoe"
  | "repoe-gems"
  | "repoe-essences"
  | "authored";

/**
 * The sources that mean the game's own data knows this row.
 *
 * Three files rather than one, because `base_items.json` names bases and nothing else — a
 * transfigured gem is only in the gem table.
 *
 * The spectre table was a fourth and is gone. It names raisable monsters, and every row it
 * was the only evidence for turned out to be a name the client rejects.
 */
const REPOE_SOURCES: readonly ItemSource[] = [
  "repoe",
  "repoe-gems",
  "repoe-essences",
];

export const knownToRepoe = (item: Item): boolean =>
  item.sources.some((source) => REPOE_SOURCES.includes(source));

/**
 * Whether a person wrote this row rather than a source producing it.
 *
 * It is asked alongside `knownToRepoe`, and answering yes to either is what keeps a row out
 * of `skipped.json`. RePoE naming a row is the game vouching for it; somebody authoring one
 * is a person vouching for it, with the reason written down beside the entry.
 */
export const isAuthored = (item: Item): boolean =>
  item.sources.includes("authored");

/**
 * One unique, as PoeWatch lists it, on the base it rolls on.
 *
 * `name` is the listing's own — `Headhunter`, `Foulborn Headhunter (Culling)`,
 * `Lightpoacher (2 Sockets)`, `Wurm's Molt (#% increased Pride Aura Effect)` — because the
 * listing is the form and the form is what has a price. A corrupted entry is a corruption
 * outcome on the listing before it, named by the implicit it rolled.
 */
export type UniqueListing = {
  readonly name: string;
  /** Chaos, a listing price. */
  readonly meanPrice: number;
  readonly corrupted: boolean;
  /** PoeWatch's own flag on this listing: a small sample or high variance stands behind it. */
  readonly lowConfidence?: boolean;
};

/**
 * The uniques on a base that one block draws: every listing filed under one category path.
 *
 * The path is the whole point. A foulborn unique and a plain one are told apart on the
 * ground by a condition, and which condition is the taxonomy's to author under this path —
 * the generator resolves it the way it resolves a row's, and learns nothing about foulborn.
 */
export type UniqueGroup = {
  readonly category: string;
  readonly subcategory: string | null;
  readonly listings: readonly UniqueListing[];
};

/**
 * One item the game can show, as every bronze file together describes it.
 *
 * Every field is `readonly`, and that is the whole design. A step builds a new row rather
 * than writing into one it was handed, so the compiler rejects the mutation instead of a
 * reviewer catching it.
 */
export type Item = {
  /** The display name, or the metadata leaf where nothing can name the item yet. */
  readonly key: string;
  readonly name: string | null;
  readonly metadataPaths: readonly string[];
  /** RePoE's internal class — `StackableCurrency`, `Wand`. Not a `.filter` `Class`. */
  readonly itemClass: string | null;
  /** From the taxonomy. Null on a row the taxonomy does not classify. */
  readonly category: string | null;
  readonly subcategory: string | null;
  readonly baseTypes: readonly string[];
  /**
   * Whether the game files this as a quest item.
   *
   * `item_class: "QuestItem"` is the only thing that says so — `domain` reads `undefined`
   * on all 282 of them. They share display names with real items freely: four of the six
   * `Maven's Invitation: The Atlas` ids are quest items and two are not.
   */
  readonly isQuestItem: boolean;
  readonly releaseState: string | null;
  readonly tags: readonly string[];
  readonly sources: readonly ItemSource[];
  /**
   * Whether the trade site lists this name.
   *
   * **The only thing that says an item can be traded at all.** RePoE exports everything the
   * client can describe, including watchstones the Atlas rework removed and the internal
   * row the Archnemesis mods hung off — all of them `release_state: "released"`. The trade
   * site's list is what separates those from what a player can actually put up for sale.
   */
  readonly tradable: boolean;
  readonly tradedOnExchange: boolean;
  /**
   * Whether a `.filter` can name this row, as the taxonomy answers it. True unless the
   * table says otherwise.
   */
  readonly filterable: boolean;
  /**
   * The conditions the taxonomy authored for this row alone, **copied and not resolved**.
   *
   * The catalog carries what was authored and composes nothing. Laying the category over the
   * subcategory over the row is the generator's job, and doing it here would bake one
   * reading of the tables into an artifact that outlives them.
   */
  readonly conditions?: readonly Condition[];
  /** The row's priced variants, copied the same way, each with its own mean. */
  readonly variants?: readonly PricedVariant[];
  /** Which PoeWatch listing prices the row, copied from the taxonomy. */
  readonly price?: PriceSelector;
  /**
   * PoeWatch's mean for the row, in Chaos. A listing price, not a sale price.
   *
   * Only a filterable row without variants carries one, so the field being there means the
   * generator can use it. A row with variants prices each of them and not itself.
   */
  readonly meanPrice?: number;
  /** PoeWatch's own flag on the listing `meanPrice` came from: a small sample or high
   * variance stands behind it. Absent wherever `meanPrice` is. */
  readonly lowConfidence?: boolean;
  /**
   * Every unique PoeWatch lists on this base, each form of each one, priced, grouped by the
   * category path that says how a filter tells the group apart.
   *
   * **A unique is not a row.** On the ground it is its base with a rarity, and a filter
   * names the base; so the base carries its uniques, and the generator decides what a Leather
   * Belt is worth drawing as from what could be on it. Absent on a base nothing unique rolls
   * on, and on everything that is not a base.
   */
  readonly uniques?: readonly UniqueGroup[];
};

/**
 * The class RePoE gives an item the game has taken out.
 *
 * `release_state` does not say it — every one of these still reads `released` — so this is
 * the only field that does.
 */
const REMOVED = "RemovedItem";

/**
 * The taxonomy category meaning "keep the row, never draw it".
 *
 * Declared here rather than imported from the taxonomy app, the same way the key layout is:
 * the two agree on a published format, not on a module. Rows land in `excluded.json` like
 * any other category, so what was set aside stays readable.
 */
const EXCLUDED = "excluded";

/**
 * The taxonomy category whose rows have to trade on the Currency Exchange to count.
 *
 * The trade site lists every currency name it has ever had — sextants, scouting reports,
 * seals — and lists it long after the game stopped dropping it. The exchange only has what
 * somebody traded this hour, and for a currency that is the better witness.
 */
const CURRENCY = "currency";

/**
 * Whether a player can get one, as the sources answer it.
 *
 * **A currency has to have traded on the exchange.** For every other category the trade
 * site's list is evidence enough; for currency it is a list of every name that ever was,
 * and the exchange is what separates a Chaos Orb from an Awakened Sextant.
 */
const isObtainable = (item: Item): boolean =>
  item.category === CURRENCY
    ? item.tradedOnExchange
    : item.tradable || item.tradedOnExchange;

/**
 * Whether the generator can write a line for this row.
 *
 * Five questions at once: can a player get one, has the game not taken it out, is it
 * something the game lets a filter act on at all, was it set aside on purpose, and can a
 * filter name it. A row that fails any of them is real enough to keep and useless to write
 * a rule for.
 *
 * **An authored row skips the first question, and only the first.** The obtainability test
 * reads the trade site and the exchange, and both are answers about selling rather than
 * about dropping. Gold drops in every map and no market will ever list it; a blighted map
 * is filed by the game as an untradable proxy. Somebody wrote the row down and wrote the
 * reason beside it, which is a better witness than a marketplace for the one question a
 * marketplace cannot answer. The rest still apply: an authored row for a removed item, a
 * quest item or an excluded category is still not filterable.
 *
 * **A quest item is never one of them.** The game shows quest items whatever a filter says,
 * so a rule for one does nothing.
 *
 * The removed and quest checks are here rather than in the taxonomy because the game's own
 * data answers them. The taxonomy is for what nothing else can settle, like a beast species
 * the client rejects while the one beside it drops.
 */
export const isFilterable = (item: Item): boolean =>
  (isAuthored(item) || isObtainable(item)) &&
  item.itemClass !== REMOVED &&
  !item.isQuestItem &&
  item.category !== EXCLUDED &&
  item.filterable;

/**
 * Why a row could not be filed under a category.
 *
 * `repoe` is a metadata path the exchange traded that the game's own export cannot name;
 * `taxonomy` is a name the published table has never heard of. They fail in different
 * places and mean different things — the first is RePoE lagging a patch, the second is the
 * taxonomy lagging a league — so the row says which.
 */
export type UnresolvedReason = "repoe" | "taxonomy";

export type UnresolvedItem = Item & {
  readonly reason: UnresolvedReason;
};

/** A row with nothing known about it yet. Each source returns a fuller copy. */
export const blankItem = (key: string, name: string | null = key): Item => ({
  key,
  name,
  metadataPaths: [],
  itemClass: null,
  category: null,
  subcategory: null,
  baseTypes: [],
  isQuestItem: false,
  releaseState: null,
  tags: [],
  sources: [],
  tradable: false,
  tradedOnExchange: false,
  filterable: true,
});

/** Adds a source to a row, and answers with the same row when it is already there. */
export const tagSource = (item: Item, source: ItemSource): Item =>
  item.sources.includes(source)
    ? item
    : { ...item, sources: [...item.sources, source] };

/** Appends to a list of strings, keeping it free of repeats. */
export const withValue = (
  values: readonly string[],
  value: string,
): readonly string[] => (values.includes(value) ? values : [...values, value]);
