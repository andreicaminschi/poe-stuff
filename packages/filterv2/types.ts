export type ItemSource = "items" | "exchange" | "repoe" | "forum";

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
  /** Named by the forum post, and RePoE does not have it yet. */
  readonly isNew: boolean;
  /** Traded on the exchange, and RePoE cannot name it. */
  readonly absentInRepoe: boolean;
  readonly renamedFrom?: string;
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
    isNew: false,
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

/** A thread as a news page links it: everything the page itself says. */
export type ThreadLink = {
  readonly threadId: number;
  readonly title: string;
};

/** A thread link, plus where it lives. `@poe/ggg` is what builds the address. */
export type ForumPost = {
  readonly threadId: number;
  readonly title: string;
  readonly url: string;
};

/** One Item Filter Information post, as the model read it. Stored per thread. */
export type ProcessedPost = {
  readonly post: ForumPost;
  readonly processedAt: string;
  /**
   * Fingerprint of the post text this answer was read from.
   *
   * GGG edits these posts in place — same thread, new content — so a thread id alone is
   * not enough to say a stored answer is still good. A search compares this against the
   * text it just fetched and only calls the model when the two differ.
   */
  readonly textChecksum: string;
  readonly newItems: readonly { itemClass: string; names: readonly string[] }[];
  readonly renamed: readonly { from: string; to: string }[];
  readonly removed: readonly string[];
  readonly newKeywords: readonly string[];
};

export type PostIndex = {
  readonly lastSearchedAt: string | null;
  readonly posts: readonly ForumPost[];
};

export type ItemsFile = {
  readonly generatedAt: string;
  readonly league: string;
  readonly hourId: number;
  /** The newest post names items RePoE has never heard of. */
  readonly newLeague: boolean;
  /** The exchange traded something RePoE cannot name. */
  readonly repoeIncomplete: boolean;
  readonly forumPost: ForumPost | null;
  readonly namesMissingFromRepoe: readonly string[];
  /**
   * Every item, keyed by its name — or by its metadata leaf where nothing can name it
   * yet, which is the same string as the row's own `key`.
   */
  readonly items: Readonly<Record<string, Item>>;
};
