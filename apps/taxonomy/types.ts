export type Condition = {
  readonly condition: string;
  readonly operator?: string;
  readonly value?: string | number | boolean | readonly string[] | null;
  readonly from?: string;
};

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
};

export type AuthoredVariant = {
  readonly name: string;
  readonly conditions: readonly Condition[];
  readonly listing?: ListingMatch;
};

export type VariantTable = Readonly<Record<string, readonly AuthoredVariant[]>>;

export type AuthoredRow = {
  readonly name: string;
  readonly category: string;
  readonly subcategory: string | null;
  readonly replaces?: readonly string[];
  readonly reason: string;
  readonly conditions?: readonly Condition[];
  readonly listing?: ListingMatch;
};

export type AuthoredTable = Readonly<Record<string, AuthoredRow>>;

export type TieringMethod = "chaos" | "stack-size";

export type AuthoredCategory = {
  readonly conditions: readonly Condition[];
  readonly name?: string;
  readonly tiering?: TieringMethod;
};

export type CategoryTable = Readonly<Record<string, AuthoredCategory>>;

export type Version = {
  readonly items: TaxonomyTable;
  readonly categories: CategoryTable;
  readonly authored: AuthoredTable;
  readonly variants: VariantTable;
};

export type AuthoredEntry = {
  readonly name: string;
  readonly category: string;
  readonly subcategory: string | null;
  readonly filterable?: boolean;
  readonly tradable?: boolean;
  readonly tradedOnExchange?: boolean;
  readonly conditions?: readonly Condition[];
  readonly listing?: ListingMatch;
};

export type TaxonomyTable = Readonly<Record<string, AuthoredEntry>>;


export type VersionState = "draft" | "published";

export type RegistryEntry = {
  readonly state: VersionState;
  readonly parent?: string;
  readonly createdAt: string;
  readonly publishedAt?: string;
};

export type Registry = {
  readonly next: number;
  readonly versions: Readonly<Record<string, RegistryEntry>>;
};

export type SourceFile =
  | "items"
  | "categories"
  | "authored.seeded"
  | "authored.manual"
  | "variants.seeded"
  | "variants.manual";

export type VersionFiles = Readonly<Record<SourceFile, unknown>>;
