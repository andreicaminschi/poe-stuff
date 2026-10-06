/** A set of values, keyed by value. Never stored empty. */
export type Bag = Readonly<Record<string, true>>;

export type Seeder = {
  readonly conditions?: Readonly<Record<string, Bag>>;
  readonly tags?: Bag;
  readonly knownItems?: Bag;
};

export type Category = {
  readonly seeders?: Readonly<Record<string, Seeder>>;
};

export type Item = {
  readonly tags?: Bag;
  readonly knownItems?: Bag;
};

/** Keyed maps all the way down: what `@util/diff-summary` needs to name every change. */
export type PanelState = {
  readonly categories: Readonly<Record<string, Category>>;
  readonly items: Readonly<Record<string, Item>>;
};

/** A value set's name, such as `"non-unique"`, or the literal values. Ranges are `"68-100"`. */
export type ConditionValues = string | readonly (string | number | boolean)[];

export type SeederPatch = {
  readonly tags?: readonly string[];
  readonly knownItems?: readonly string[];
  readonly conditions?: Readonly<Record<string, ConditionValues>>;
};

/** Like a patch, except `null` drops a whole condition. */
export type SeederRemoval = {
  readonly tags?: readonly string[];
  readonly knownItems?: readonly string[];
  readonly conditions?: Readonly<Record<string, ConditionValues | null>>;
};

export type ItemPatch = {
  readonly tags?: readonly string[];
  readonly knownItems?: readonly string[];
};

/** Every seeder of the named categories, plus the named seeders, minus the excepted ones. */
export type Targets = {
  readonly categories?: readonly string[];
  readonly seeders?: readonly string[];
  readonly except?: readonly string[];
};
