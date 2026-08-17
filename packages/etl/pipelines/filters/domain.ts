/**
 * Contract for the friendly form of the trade search form. Owned by us, not
 * GGG — everything downstream of `transform.ts` should speak only this.
 */

export type FilterOption = {
  /** Null is GGG's "leave this filter unset" sentinel, kept rather than dropped. */
  readonly value: string | null;
  readonly label: string;
};

/** A name lookup against a category of known items instead of a fixed list. */
export type KnownItemLookup = {
  readonly uniques: boolean;
  readonly cards: boolean;
  readonly currency: boolean;
};

/** How the trade site draws the control. Kept together so `Filter` stays readable. */
export type FilterLayout = {
  readonly fullSpan: boolean;
  readonly halfSpan: boolean;
  readonly sockets: boolean;
};

export const FILTER_KINDS = ["range", "select", "lookup", "text", "toggle"] as const;
export type FilterKind = (typeof FILTER_KINDS)[number];

export type Filter = {
  readonly id: string;
  /** Group id, e.g. `weapon_filters`. Repeated so the flat output stands alone. */
  readonly group: string;
  /** Null on `status`, the one filter the site renders without a label. */
  readonly label: string | null;
  /** What kind of control this is, derived from GGG's flags. */
  readonly kind: FilterKind;
  readonly tip: string | null;
  readonly placeholder: string | null;
  readonly options: readonly FilterOption[];
  readonly knownItem: KnownItemLookup | null;
  readonly layout: FilterLayout;
};

export type FilterGroup = {
  readonly id: string;
  /** Null on `status_filters`, which renders outside the panels. */
  readonly title: string | null;
  /** True when the panel starts collapsed. */
  readonly hidden: boolean;
  readonly count: number;
  readonly filters: readonly Filter[];
};

export type FilterTotals = {
  readonly groups: number;
  readonly filters: number;
  readonly byKind: Readonly<Record<FilterKind, number>>;
};

export type Filters = {
  readonly totals: FilterTotals;
  readonly groups: readonly FilterGroup[];
};
