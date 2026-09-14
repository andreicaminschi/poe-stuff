export type TaxonomyServiceOptions = {
  root?: string;
  prefix?: string;
};

export type Condition = {
  readonly condition: string;
  readonly operator?: string;
  readonly value?: string | number | boolean | readonly string[] | null;
  readonly from?: string;
};

/** One query, or several when a row links more than one listing. */
export type Listing = ListingMatch | readonly ListingMatch[];

export type ListingMatch = {
  readonly name?: string;
  readonly passives?: string;
  readonly gemLevel?: number;
  readonly gemQuality?: number;
  readonly gemIsCorrupted?: boolean;
  readonly linkCount?: number;
  readonly itemLevel?: number;
  readonly mapTier?: number;
  readonly tier?: number;
  readonly frame?: number;
  readonly influences?: string;
  readonly synthesised?: boolean;
};

export type TaxonomyVariant = {
  readonly name: string;
  readonly conditions: readonly Condition[];
  readonly listing?: Listing;
};

export type TaxonomyEntry = {
  readonly name: string;
  readonly displayName?: string;
  readonly category: string;
  readonly subcategory: string | null;
  readonly filterable?: boolean;
  readonly tradable?: boolean;
  readonly tradedOnExchange?: boolean;
  readonly excluded?: boolean;
  readonly quest?: boolean;
  readonly conditions?: readonly Condition[];
  readonly variants?: readonly TaxonomyVariant[];
  readonly listing?: Listing;
};

export type TaxonomyAuthored = {
  readonly name: string;
  readonly baseType: string;
  readonly category: string;
  readonly subcategory: string | null;
  readonly replaces?: readonly string[];
  readonly reason: string;
  readonly excluded?: boolean;
  readonly quest?: boolean;
  readonly conditions?: readonly Condition[];
  readonly variants?: readonly TaxonomyVariant[];
  readonly listing?: Listing;
};

export type TieringMethod = "chaos" | "stack-size";

export type TaxonomyCategory = {
  readonly conditions: readonly Condition[];
  readonly name?: string;
  readonly tiering?: TieringMethod;
};
