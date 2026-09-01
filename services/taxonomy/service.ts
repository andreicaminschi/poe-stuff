import { DEFAULT_PREFIX } from "./config.ts";
import { getTaxonomy } from "./get-taxonomy.ts";
import type { Taxonomy } from "./get-taxonomy.types.ts";
import type { TaxonomyServiceOptions } from "./types.ts";

export type TaxonomyService = {
  /** One version, or the one `latest.json` points at when none is named. */
  getTaxonomy(version?: string): Promise<Taxonomy>;
};

/**
 * The taxonomy behind one object.
 *
 * **A third party that happens to be ours.** `apps/taxonomy` writes these files and this
 * package reads them, and the two share no code on purpose — a reader that imported the
 * writer's types could not tell a format change from a compile error. It is the same
 * arrangement as `@poe/filter-eval` reading what something else wrote.
 *
 * No limiter and no cache: there is no budget to overrun and nothing here goes to GGG. The
 * store handed in is the only thing that touches storage.
 */
export function createTaxonomyService({
  store,
  prefix = DEFAULT_PREFIX,
}: TaxonomyServiceOptions): TaxonomyService {
  return {
    getTaxonomy: (version) => getTaxonomy(store, prefix, version),
  };
}
