import type { Taxonomy } from "@poe/taxonomy/get-taxonomy.types";
import type { TaxonomyAuthored, TaxonomyEntry } from "@poe/taxonomy/types";
import type { Item } from "../item.ts";

const rowOf = (key: string, entry: TaxonomyEntry | TaxonomyAuthored, baseType: string): Item => ({
  key,
  name: entry.name,
  category: entry.category,
  subcategory: entry.subcategory,
  baseTypes: [baseType],
  ...(entry.quest === true ? { quest: true } : {}),
  ...(entry.conditions === undefined ? {} : { conditions: entry.conditions }),
  ...(entry.variants === undefined ? {} : { variants: entry.variants }),
  ...(entry.listing === undefined ? {} : { listing: entry.listing }),
});

/**
 * The catalog's rows: every drawable row of the published taxonomy.
 *
 * Drawable is the taxonomy's own rule. An item is left out when it is `excluded`, when a
 * filter cannot name it (`filterable: false`), or when an authored row `replaces` it. An
 * authored row is left out only when it is `excluded`. Nothing else is asked.
 */
export function fromTaxonomy(taxonomy: Taxonomy): readonly Item[] {
  const replaced = new Set(Object.values(taxonomy.authored).flatMap((entry) => entry.replaces ?? []));

  const items = Object.entries(taxonomy.items)
    .filter(([key, entry]) => !replaced.has(key) && entry.excluded !== true && entry.filterable !== false)
    .map(([key, entry]) => ({
      ...rowOf(key, entry, entry.name),
      ...(entry.displayName === undefined ? {} : { displayName: entry.displayName }),
    }));

  const authored = Object.entries(taxonomy.authored)
    .filter(([, entry]) => entry.excluded !== true)
    .map(([key, entry]) => rowOf(key, entry, entry.baseType));

  return [...items, ...authored];
}
