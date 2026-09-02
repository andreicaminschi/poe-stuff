/**
 * One item's classification, as it is authored.
 *
 * This app declares its own shape rather than importing the reader's. `@poe/taxonomy` is
 * what reads a published file back, and the two agreeing is the point of publishing a
 * format instead of a module — a shared types file would mean neither could move without
 * the other, and the reader could no longer tell a format change from a compile error.
 */
export type AuthoredEntry = {
  /**
   * The display name, kept beside the metadata id the row is keyed by.
   *
   * The key is what the catalog joins on and the name is what a `.filter` matches, and they
   * are not one to one: a unique that rolls on two bases is two ids under one name, and two
   * ids can share a name outright — `Wildfire` is a skill gem and a unique jewel.
   */
  readonly name: string;
  /**
   * The broad group the row belongs to, and where its silver file gets its name.
   *
   * **`excluded` is reserved.** A row in it is one nobody wants in a generated filter —
   * not because a filter could not name it, which is what `filterable` says, but because it
   * should not be drawn at all. Everything in that category lands in `excluded.json` and
   * never reaches a `.filterable.json`.
   */
  readonly category: string;
  readonly subcategory: string | null;
  /**
   * Whether a `.filter` can name this row at all.
   *
   * **Absent means yes.** Most rows can be named, so only the exceptions are written down
   * and the field stays out of the way of the hand pass.
   *
   * The trade site listing a name is not evidence that a base type exists — the client
   * answers `no basetypes found for "Alpine Shaman"` for a name `/data/items` lists and the
   * spectre table confirms. Nothing in either file separates that from `Bearded Shaman`,
   * which really does drop, so the client is the only authority and this is where its
   * answer is written down.
   */
  readonly filterable?: boolean;
  /**
   * Whether the trade site lists this name, said by hand where the sources get it wrong.
   *
   * **Absent means take the sources' answer.** These two are the only fields here that
   * override a fact rather than add one, so writing either is a claim that the game's data
   * and the trade site are both answering a different question than the one asked.
   *
   * `Metadata/Items/TradeProxy/BlightedMap` is why they exist. RePoE has the row and marks
   * it untradable because the proxy itself is not an item, while the trade site lists 145
   * blighted map names against it. The item drops, a filter draws it with `BlightedMap
   * True`, and nothing in either source says so.
   */
  readonly tradable?: boolean;
  readonly tradedOnExchange?: boolean;
  /**
   * What the seed said, kept beside what a person decided.
   *
   * **Never edited.** The pair is what makes a hand pass reviewable: a row where the two
   * differ was a deliberate correction, and a row where they match has either been checked
   * and left alone or not been looked at yet. Overwriting this to match a correction throws
   * away the only record that the correction happened.
   */
  readonly original: {
    readonly category: string;
    readonly subcategory: string | null;
  };
};

/** One version's whole table, keyed by display name. */
export type TaxonomyTable = Readonly<Record<string, AuthoredEntry>>;

/** Somewhere published versions are written. This app's own, not the catalog's. */
export type Lake = {
  readJson<T>(key: string): Promise<T>;
  writeJson(key: string, value: unknown): Promise<void>;
  exists(key: string): Promise<boolean>;
};
