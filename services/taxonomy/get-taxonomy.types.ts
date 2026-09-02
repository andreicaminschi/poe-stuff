/**
 * One `.filter` condition, structured rather than written out as a line.
 *
 * `value` is a literal and `from` reads a field off the catalog row instead — exactly one of
 * the two. **`value: null` removes** a condition an earlier level added, which is how
 * `map/blighted` drops the `BaseType` its category authored.
 *
 * `operator` defaults to `==`. It is here before anything needs it because `MapTier >= 11`
 * and `GemLevel >= 20` are coming, and a notation keyed on `==` alone could never grow them.
 */
export type Condition = {
  readonly condition: string;
  readonly operator?: string;
  readonly value?: string | number | boolean | readonly string[] | null;
  readonly from?: string;
};

/**
 * Which of PoeWatch's listings for a name is the one to price. Its keys are PoeWatch's own
 * field names, and a listing matches when every written key is equal on it. Absent means
 * the most-listed row for the name. `name` is the listing's own name where it differs from
 * the row's display name; a variant without one inherits its row's.
 */
export type PriceSelector = {
  readonly name?: string;
  readonly passives?: string;
  readonly gemLevel?: number;
  readonly gemQuality?: number;
  readonly gemIsCorrupted?: boolean;
  readonly linkCount?: number;
  readonly itemLevel?: number;
  readonly mapTier?: number;
  readonly tier?: number;
};

/**
 * One variant of an item: a narrower condition set, priced on its own.
 *
 * A level 6 Awakened Added Chaos and a level 1 are one base type, two prices and two blocks.
 * The variant is what a price attaches to, so an item with variants resolves once per
 * variant and not once for itself.
 */
export type TaxonomyVariant = {
  readonly name: string;
  readonly conditions: readonly Condition[];
  /** Which listing prices this variant. Absent means the most-listed row for the name. */
  readonly price?: PriceSelector;
};

/**
 * What the taxonomy says about one category or subcategory, keyed by its path.
 *
 * The tree is flattened into the key: `map` and `map/blighted` sit side by side, and the
 * path is the only thing that makes one the parent of the other. A category record does two
 * jobs — it is the default for its own rows and the parent of its children — and five
 * categories today have both.
 */
export type TaxonomyCategory = {
  readonly conditions: readonly Condition[];
};

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
  /** Conditions for this row alone, applied over its category's and subcategory's. */
  readonly conditions?: readonly Condition[];
  /** One priced variant per entry. Absent means the row resolves once, as itself. */
  readonly variants?: readonly TaxonomyVariant[];
  /** Which listing prices the row itself. Read only on a row without variants. */
  readonly price?: PriceSelector;
};

/**
 * A row somebody wrote by hand, because no source produces it. Keyed `authored/<slug>`.
 *
 * `replaces` names the item keys it stands in for. The catalog builds the row from those and
 * this entry, so what is here is the decision — name, category, conditions, price — and not
 * the facts the sources already hold about the rows it replaces.
 */
export type TaxonomyAuthored = {
  readonly name: string;
  readonly category: string;
  readonly subcategory: string | null;
  readonly replaces?: readonly string[];
  readonly reason: string;
  /** Whether the row is a unique. Absent means ask the rows it replaces. */
  readonly isUnique?: boolean;
  readonly conditions?: readonly Condition[];
  readonly variants?: readonly TaxonomyVariant[];
  readonly price?: PriceSelector;
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
  /** Keyed by path — `map`, then `map/blighted`. The flattened tree. */
  readonly categories: Readonly<Record<string, TaxonomyCategory>>;
  /** The hand-written rows, keyed `authored/<slug>`. Usually a handful. */
  readonly authored: Readonly<Record<string, TaxonomyAuthored>>;
};

/** What `latest.json` holds: the version that is current, and nothing else. */
export type TaxonomyPointer = {
  readonly version: string;
};
