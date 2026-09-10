import type { TaxonomyCategory } from "./types.ts";

export type TaxonomyCategories = {
  readonly version: string;
  readonly categories: Readonly<Record<string, TaxonomyCategory>>;
};
