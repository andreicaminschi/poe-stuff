/**
 * What the taxonomy says about one item.
 *
 * Keyed by the display name everywhere, because that is the one name that survives: GGG
 * renames metadata ids between leagues, and a `.filter` matches on the display name anyway.
 */
export type TaxonomyEntry = {
  /** The display name. What a `.filter` matches, where the key is what a catalog joins on. */
  readonly name: string;
  /** The broad group, as the trade site divides them: `weapon`, `currency`, `map`. */
  readonly category: string;
  /**
   * The division inside that category — `essence`, `scarabs`, `delve`. Null where nothing
   * knows one, which is most of what is not currency.
   */
  readonly subcategory: string | null;
  /**
   * Whether a `.filter` can name this row. **Absent means yes** — only the exceptions are
   * written down, so a reader treats a missing field as `true`.
   */
  readonly filterable?: boolean;
  /**
   * Overrides for what the sources say about obtaining the item. **Absent means take the
   * sources' answer**, which is the ordinary case — only the rows they get wrong are
   * written down.
   */
  readonly tradable?: boolean;
  readonly tradedOnExchange?: boolean;
};

/**
 * One published version of the taxonomy: every item it classifies, keyed by metadata id.
 *
 * **Keyed by id, not by name.** Two items can share a display name — a skill gem and a
 * unique jewel both called `Wildfire` — and a name-keyed table gave them one classification
 * between them. A unique's id is the base it rolls on with its name appended,
 * `Metadata/Items/Belts/Belt3:Gluttony`, since the game's data gives a unique no id of its
 * own. Rows nothing can identify keep their name as the key.
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
