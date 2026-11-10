import type { Operator } from "@poe/filter-eval/filter-ast";

/** A set of values, keyed by value. Never stored empty. */
export type Bag = Readonly<Record<string, true>>;

/** The grammar's operators plus `range`, whose value is `"a-b"`. */
export type ConditionOperator = Operator | "range";

/** One condition's values, each with its operator. Never stored empty. */
export type ConditionValues = Readonly<Record<string, ConditionOperator>>;

/** Whether a condition splits into one item per value, by condition name. */
export type SplitSettings = Readonly<Record<string, boolean>>;

export type Seeder = {
  readonly conditions?: Readonly<Record<string, ConditionValues>>;
  /** Overrides of the split defaults. */
  readonly split?: SplitSettings;
  readonly names?: Bag;
};

/** The tags every item of one seeder gets. Keyed by seeder name. */
export type SeederTags = { readonly tags: Bag };

/** Tags every item whose values meet each condition: any listed value per condition, operators ignored. */
export type TagSeeder = {
  readonly conditions: Readonly<Record<string, Bag>>;
  readonly tags: Bag;
};

export type Category = {
  readonly seeders?: Readonly<Record<string, Seeder>>;
};

export const PRICE_PROVIDERS = ["poewatch"] as const;

export type PriceProvider = (typeof PRICE_PROVIDERS)[number];

export type Price = { readonly provider: PriceProvider; readonly id: string };

/** What one generated item holds, keyed by its item key. */
export type Item = {
  /** Keyed by `provider:id`. */
  readonly prices?: Readonly<Record<string, Price>>;
};

/**
 * Keyed maps all the way down. `items` is keyed by item key and holds only items that are
 * generated. `seederTags` is keyed by seeder name, `tagSeeders` by tag seeder name.
 */
export type PanelState = {
  readonly categories: Readonly<Record<string, Category>>;
  readonly items: Readonly<Record<string, Item>>;
  readonly seederTags: Readonly<Record<string, SeederTags>>;
  readonly tagSeeders: Readonly<Record<string, TagSeeder>>;
};

export type SeederPatch = {
  readonly names?: readonly string[];
  readonly conditions?: Readonly<Record<string, ConditionValues>>;
  readonly split?: SplitSettings;
};

/** Like a patch, except `null` drops a whole condition, and `split` names overrides to drop. */
export type SeederRemoval = {
  readonly names?: readonly string[];
  readonly conditions?: Readonly<Record<string, readonly string[] | null>>;
  readonly split?: readonly string[];
};

export type ItemPatch = {
  readonly prices?: readonly Price[];
};

/** A tag seeder edit. `null` in a removal drops a whole condition. */
export type TagSeederPatch = {
  readonly conditions?: Readonly<Record<string, readonly string[]>>;
  readonly tags?: readonly string[];
};

export type TagSeederRemoval = {
  readonly conditions?: Readonly<Record<string, readonly string[] | null>>;
  readonly tags?: readonly string[];
};

/** Every seeder of the named categories, plus the named seeders, minus the excepted ones. */
export type Targets = {
  readonly categories?: readonly string[];
  readonly seeders?: readonly string[];
  readonly except?: readonly string[];
};
