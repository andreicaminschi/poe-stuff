import type { Category, Item, Level, ListingMatch } from "../api/taxonomy/types.ts";

export type Changes = {
  readonly items: Readonly<Record<string, Item>>;
  readonly categories: Readonly<Record<string, Category | null>>;
};

export type CategoryNode = {
  readonly path: string;
  readonly label: string;
  readonly count: number;
  readonly authored: boolean;
  readonly children: readonly CategoryNode[];
};

export type CategoryTree = {
  readonly nodes: readonly CategoryNode[];
};

export type Flag = "filterable" | "tradable" | "tradedOnExchange";

export type Tab = "item" | "variants";

export type View = "included" | "excluded";

export type BootState = "waiting" | "running" | "done" | "failed";

/** One line of the opening screen. */
export type BootStep = {
  readonly id: string;
  readonly label: string;
  readonly state: BootState;
  readonly detail?: string;
};

/** One suggestion in a searchable picker. The label shows under the value. */
export type ValueOption = { readonly value: string; readonly label?: string };

/** A "Listed as" choice: the listing's text, and the query that finds it. */
export type PriceOption = ValueOption & { readonly listing: ListingMatch };

/** Suggestions per condition name, such as `Class` and `BaseType`. */
export type ValueOptions = Readonly<Record<string, readonly ValueOption[]>>;

/** The name behind each level a condition can come from, e.g. `category: "StackableCurrency"`. */
export type Origins = Readonly<Partial<Record<Level, string>>>;

/** What a `from` condition fills in on one item. */
export type FromValues = { readonly name: string; readonly baseTypes: readonly string[] };

export type CategoryTarget =
  | { readonly kind: "edit"; readonly path: string }
  | { readonly kind: "new-category" }
  | { readonly kind: "new-subcategory" };

export type Dialog =
  | { readonly kind: "validation" }
  | { readonly kind: "runs" }
  | { readonly kind: "changes" }
  | { readonly kind: "compiled" }
  | { readonly kind: "category"; readonly target: CategoryTarget }
  | { readonly kind: "author"; readonly replaces: string }
  | { readonly kind: "discover" };

export type Kind = "text" | "number" | "flag" | "list" | "from-name" | "from-baseTypes" | "remove";
