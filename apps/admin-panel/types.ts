export type ConditionValue = string | boolean | readonly [number, number];

export type Seeder = {
  readonly name: string;
  readonly conditions: Readonly<Record<string, readonly ConditionValue[]>>;
  readonly knownItems?: readonly string[];
  readonly tags: readonly string[];
};

export type Category = {
  readonly name: string;
  readonly seeders: readonly Seeder[];
};

export type WalEntry = {
  readonly id: string;
  readonly at: string;
  readonly category: string;
  readonly op?: "createCategory" | "deleteCategory";
  readonly toCategory?: string;
  readonly before?: Seeder;
  readonly after?: Seeder;
  readonly undoes?: string;
};

export type CategoriesFile = {
  readonly version: string;
  readonly categories: readonly Category[];
};

export type ManifestEntry = {
  readonly state: "draft" | "published";
  readonly parent?: string;
  readonly createdAt: string;
  readonly publishedAt?: string;
};

export type Manifest = {
  readonly next: number;
  readonly promoted?: string;
  readonly versions: Readonly<Record<string, ManifestEntry>>;
};
