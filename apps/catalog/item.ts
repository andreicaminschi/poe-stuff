/** Which bronze file put something on a row. */
export type ItemSource =
  | "items"
  | "exchange"
  | "repoe"
  | "repoe-gems"
  | "repoe-essences";

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
  readonly isUnique: boolean;
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
};

/**
 * The class RePoE gives an item the game has taken out.
 *
 * `release_state` does not say it — every one of these still reads `released` — so this is
 * the only field that does.
 */
const REMOVED = "RemovedItem";

/**
 * Whether the generator can write a line for this row.
 *
 * Three questions at once: can a player get one — the trade site lists it, or it traded on
 * the exchange — has the game not taken it out, and can a filter name it. A row that fails
 * any of them is real enough to keep and useless to write a rule for.
 *
 * The removed check is here rather than in the taxonomy because the game's own data answers
 * it. The taxonomy is for what nothing else can settle, like a beast species the client
 * rejects while the one beside it drops.
 */
export const isFilterable = (item: Item): boolean =>
  (item.tradable || item.tradedOnExchange) &&
  item.itemClass !== REMOVED &&
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
  isUnique: false,
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
