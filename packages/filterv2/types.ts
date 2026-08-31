export type ItemSource = "items" | "exchange" | "repoe";

/**
 * One item the game can show, as everything that knows about it agrees.
 *
 * Every field is `readonly`, and that is the whole design. A step in this pipeline builds
 * a new row rather than writing into one it was handed, so the compiler rejects the
 * mutation instead of a reviewer catching it.
 */
export type Item = {
  /** The display name, or the metadata leaf when nothing can name the item yet. */
  readonly key: string;
  readonly name: string | null;
  readonly metadataPaths: readonly string[];
  readonly itemClass: string | null;
  readonly category: string | null;
  readonly baseTypes: readonly string[];
  readonly isUnique: boolean;
  readonly releaseState: string | null;
  readonly tags: readonly string[];
  readonly sources: readonly ItemSource[];
  readonly tradedOnExchange: boolean;
  /** Traded on the exchange, and RePoE cannot name it. */
  readonly absentInRepoe: boolean;
};

/** A row with nothing known about it yet. Each source returns a fuller copy. */
export function blankItem(key: string, name: string | null = key): Item {
  return {
    key,
    name,
    metadataPaths: [],
    itemClass: null,
    category: null,
    baseTypes: [],
    isUnique: false,
    releaseState: null,
    tags: [],
    sources: [],
    tradedOnExchange: false,
    absentInRepoe: false,
  };
}

/**
 * Every item the build knows about, keyed by `item.key`.
 *
 * `ReadonlyMap` on purpose: a function that takes one of these cannot `set` or `delete`,
 * so the only way to change the list is to return a new one.
 */
export type ItemsByKey = ReadonlyMap<string, Item>;

/** Adds `source` to a row, and answers with the same row when it is already there. */
export const tagSource = (item: Item, source: ItemSource): Item =>
  item.sources.includes(source)
    ? item
    : { ...item, sources: [...item.sources, source] };

/** One market in the currency hour. Only these two fields are read. */
export type Market = {
  readonly league: string;
  readonly market_pair?: readonly string[];
};

export type ItemsFile = {
  readonly generatedAt: string;
  readonly league: string;
  readonly hourId: number;
  /** The exchange traded something RePoE cannot name. */
  readonly repoeIncomplete: boolean;
  /**
   * Every item, keyed by its name — or by its metadata leaf where nothing can name it
   * yet, which is the same string as the row's own `key`.
   */
  readonly items: Readonly<Record<string, Item>>;
};
