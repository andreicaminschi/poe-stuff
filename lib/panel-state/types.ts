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
  readonly tags?: Bag;
  readonly names?: Bag;
};

export type Category = {
  readonly seeders?: Readonly<Record<string, Seeder>>;
};

export const PRICE_PROVIDERS = ["poewatch"] as const;

export type PriceProvider = (typeof PRICE_PROVIDERS)[number];

export type Price = { readonly provider: PriceProvider; readonly id: string };

/** What one generated item holds, keyed by its item key. */
export type Item = {
  readonly tags?: Bag;
  /** Keyed by `provider:id`. */
  readonly prices?: Readonly<Record<string, Price>>;
};

/** Keyed maps all the way down. `items` is keyed by item key and holds only items that are generated. */
export type PanelState = {
  readonly categories: Readonly<Record<string, Category>>;
  readonly items: Readonly<Record<string, Item>>;
};

export type SeederPatch = {
  readonly tags?: readonly string[];
  readonly names?: readonly string[];
  readonly conditions?: Readonly<Record<string, ConditionValues>>;
  readonly split?: SplitSettings;
};

/** Like a patch, except `null` drops a whole condition, and `split` names overrides to drop. */
export type SeederRemoval = {
  readonly tags?: readonly string[];
  readonly names?: readonly string[];
  readonly conditions?: Readonly<Record<string, readonly string[] | null>>;
  readonly split?: readonly string[];
};

export type ItemPatch = {
  readonly tags?: readonly string[];
  readonly prices?: readonly Price[];
};

/** Every seeder of the named categories, plus the named seeders, minus the excepted ones. */
export type Targets = {
  readonly categories?: readonly string[];
  readonly seeders?: readonly string[];
  readonly except?: readonly string[];
};
