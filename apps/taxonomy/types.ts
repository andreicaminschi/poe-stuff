/**
 * One item's classification, as it is authored.
 *
 * This app declares its own shape rather than importing the reader's. `@poe/taxonomy` is
 * what reads a published file back, and the two agreeing is the point of publishing a
 * format instead of a module — a shared types file would mean neither could move without
 * the other, and the reader could no longer tell a format change from a compile error.
 */
export type AuthoredEntry = {
  readonly category: string;
  readonly subcategory: string | null;
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
