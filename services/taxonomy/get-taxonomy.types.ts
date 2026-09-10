import type { TaxonomyAuthored, TaxonomyEntry } from "./types.ts";

export type Taxonomy = {
  readonly version: string;
  readonly items: Readonly<Record<string, TaxonomyEntry>>;
  readonly authored: Readonly<Record<string, TaxonomyAuthored>>;
};
