import { createLakeService } from "@poe/lake/service";
import { DEFAULT_PREFIX } from "./config.ts";
import { getCategories } from "./get-categories.ts";
import type { TaxonomyCategories } from "./get-categories.types.ts";
import { getTaxonomy } from "./get-taxonomy.ts";
import type { Taxonomy } from "./get-taxonomy.types.ts";
import type { TaxonomyServiceOptions } from "./types.ts";

export type TaxonomyService = {
  getTaxonomy(version?: string): Promise<Taxonomy>;
  getCategories(version?: string): Promise<TaxonomyCategories>;
};

export function createTaxonomyService({
  root,
  prefix = DEFAULT_PREFIX,
}: TaxonomyServiceOptions = {}): TaxonomyService {
  const lake = createLakeService({ root });

  return {
    getTaxonomy: (version) => getTaxonomy(lake, prefix, version),
    getCategories: (version) => getCategories(lake, prefix, version),
  };
}
