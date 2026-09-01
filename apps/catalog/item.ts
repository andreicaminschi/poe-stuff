/** Which bronze file put something on a row. */
export type ItemSource = "items" | "exchange" | "repoe";

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
  readonly tradedOnExchange: boolean;
};

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
  tradedOnExchange: false,
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
