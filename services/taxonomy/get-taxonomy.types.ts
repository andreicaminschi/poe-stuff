/**
 * What the taxonomy says about one item.
 *
 * Keyed by the display name everywhere, because that is the one name that survives: GGG
 * renames metadata ids between leagues, and a `.filter` matches on the display name anyway.
 */
export type TaxonomyEntry = {
  /** The broad group, as the trade site divides them: `weapon`, `currency`, `map`. */
  readonly category: string;
  /**
   * The division inside that category — `essence`, `scarabs`, `delve`. Null where nothing
   * knows one, which is most of what is not currency.
   */
  readonly subcategory: string | null;
};

/**
 * One published version of the taxonomy: every item it classifies, keyed by display name.
 *
 * A plain object rather than a list, so a lookup is a property access. There is no index to
 * build and nothing to scan.
 */
export type Taxonomy = {
  readonly version: string;
  readonly items: Readonly<Record<string, TaxonomyEntry>>;
};

/** What `latest.json` holds: the version that is current, and nothing else. */
export type TaxonomyPointer = {
  readonly version: string;
};
