import type {
  Condition,
  ListingMatch,
  TaxonomyVariant,
  TieringMethod,
} from "@poe/taxonomy/types";

export type { Condition, ListingMatch };

import type { RemovedCondition, ResolvedCondition } from "@poe/filter-compile/types";

export type { Level, RemovedCondition, ResolvedCondition } from "@poe/filter-compile/types";

/** What one form of a row resolves to: its conditions, what was removed, and anything wrong. */
export type Resolution = {
  readonly key: string;
  readonly variant?: string;
  readonly conditions: readonly ResolvedCondition[];
  readonly removed: readonly RemovedCondition[];
  readonly problems: readonly string[];
};

export type ConditionValue = Exclude<Condition["value"], undefined>;

export type Classification = {
  readonly category: string;
  readonly subcategory: string | null;
};

export type Variant = TaxonomyVariant;

type ItemFields = {
  readonly key: string;
  readonly name: string;
  readonly classification: Classification;
  readonly conditions: readonly Condition[];
  readonly listing?: ListingMatch;
  readonly variants: readonly Variant[];
  readonly excluded?: boolean;
};

export type GggItem = ItemFields & {
  readonly source: "ggg";
  /** The internal name the panel shows. `name` stays RePoE's. */
  readonly displayName?: string;
  readonly filterable?: boolean;
  readonly tradable?: boolean;
  readonly tradedOnExchange?: boolean;
};

export type AuthoredItem = ItemFields & {
  readonly source: "authored";
  readonly baseType: string;
  readonly reason: string;
  readonly replaces: readonly string[];
};

export type Item = GggItem | AuthoredItem;

export type Tiering = TieringMethod;

export type Category = {
  readonly path: string;
  readonly name?: string;
  readonly tiering: Tiering;
  readonly conditions: readonly Condition[];
};

export type Draft = {
  readonly id: string;
  readonly items: Readonly<Record<string, Item>>;
  readonly categories: Readonly<Record<string, Category>>;
};

export type DraftChanges = {
  readonly items?: Readonly<Record<string, Item>>;
  readonly categories?: Readonly<Record<string, Category | null>>;
};

export type ItemRow = {
  readonly name: string;
  readonly displayName?: string;
  readonly category: string;
  readonly subcategory: string | null;
  readonly filterable?: boolean;
  readonly tradable?: boolean;
  readonly tradedOnExchange?: boolean;
  readonly excluded?: boolean;
  readonly conditions?: readonly Condition[];
  readonly listing?: ListingMatch;
};

export type AuthoredRow = {
  readonly name: string;
  readonly baseType: string;
  readonly category: string;
  readonly subcategory: string | null;
  readonly replaces?: readonly string[];
  readonly reason: string;
  readonly excluded?: boolean;
  readonly conditions?: readonly Condition[];
  readonly listing?: ListingMatch;
};

export type CategoryRecord = {
  readonly conditions: readonly Condition[];
  readonly name?: string;
  readonly tiering?: Tiering;
};

export type ItemsFile = Readonly<Record<string, ItemRow>>;
export type AuthoredFile = Readonly<Record<string, AuthoredRow>>;
export type VariantsFile = Readonly<Record<string, readonly Variant[]>>;
export type CategoriesFile = Readonly<Record<string, CategoryRecord>>;
