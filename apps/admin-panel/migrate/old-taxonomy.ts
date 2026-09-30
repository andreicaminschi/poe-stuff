export type OldCondition = {
  readonly condition: string;
  readonly operator?: string;
  readonly value?: unknown;
  readonly from?: string;
};

export type OldListing = { readonly name?: string };

export type OldRow = {
  readonly name: string;
  readonly baseType?: string;
  readonly category: string;
  readonly subcategory: string | null;
  readonly conditions?: readonly OldCondition[];
  readonly variants?: readonly { readonly listing?: OldListing | readonly OldListing[] }[];
  readonly listing?: OldListing | readonly OldListing[];
  readonly excluded?: boolean;
  readonly quest?: boolean;
  readonly filterable?: boolean;
};

export type OldTaxonomy = {
  readonly items: Readonly<Record<string, OldRow>>;
  readonly authored: Readonly<Record<string, OldRow>>;
};

export type OldCategoryNames = Readonly<Record<string, { readonly name: string }>>;

export type OldCategories = { readonly categories: OldCategoryNames };

/** Lists every row of the old taxonomy, generated and authored alike. Low, Sonar 0. */
export const listOldRows = (taxonomy: OldTaxonomy): readonly OldRow[] => [
  ...Object.values(taxonomy.items),
  ...Object.values(taxonomy.authored),
];

/** Reads the base a row stands for: an authored row's `baseType`, else its name. Low, Sonar 0. */
export const readBaseType = (row: OldRow): string => row.baseType ?? row.name;

/** Formats a row's old `category/subcategory` path, the key of the old category table. Low, Sonar 0. */
export const formatOldPath = (row: OldRow): string => `${row.category}/${String(row.subcategory)}`;
