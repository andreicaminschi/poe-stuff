import type { Taxonomy } from "@poe/taxonomy/get-taxonomy.types";
import type { Item, UnresolvedItem } from "../item.ts";

export type ClassifiedItems = {
  readonly classified: readonly Item[];
  readonly unresolved: readonly UnresolvedItem[];
};

/**
 * Files every row under the category the taxonomy gives it.
 *
 * **Two ways to fall out, and the row says which.** A row with no name is one the exchange
 * traded and RePoE could not name, so there is nothing to look up — `repoe`. A row with a
 * name the table has never heard of is `taxonomy`, and a run that produces a lot of those
 * is the signal that a league landed and the table has not caught up.
 *
 * Nothing is dropped. An unresolved row is an output, because a row that vanished would
 * make a taxonomy falling a league behind look like an ordinary quiet run.
 */
export function classifyItems(
  items: readonly Item[],
  taxonomy: Taxonomy,
): ClassifiedItems {
  const classified: Item[] = [];
  const unresolved: UnresolvedItem[] = [];

  for (const item of items) {
    if (item.name === null) {
      unresolved.push({ ...item, reason: "repoe" });
      continue;
    }

    // Joined on the key, not the name. The key is the metadata id both sides agree on.
    const entry = taxonomy.items[item.key];

    if (entry === undefined) {
      unresolved.push({ ...item, reason: "taxonomy" });
      continue;
    }

    classified.push({
      ...item,
      category: entry.category,
      subcategory: entry.subcategory,
      // Absent in the table means filterable; only a written `false` says otherwise.
      filterable: entry.filterable ?? true,
      // These two the sources already answered, so absent keeps their answer. A written one
      // is a person saying the sources are wrong about this row — the blighted map proxy,
      // which RePoE marks untradable while the trade site lists 145 names against it.
      tradable: entry.tradable ?? item.tradable,
      tradedOnExchange: entry.tradedOnExchange ?? item.tradedOnExchange,
      // Copied, not composed. The generator lays the category and subcategory over these.
      ...(entry.conditions === undefined ? {} : { conditions: entry.conditions }),
      ...(entry.variants === undefined ? {} : { variants: entry.variants }),
      ...(entry.price === undefined ? {} : { price: entry.price }),
    });
  }

  return { classified, unresolved };
}
