import type { TaxonomyAuthored } from "@poe/taxonomy/get-taxonomy.types";
import { blankItem } from "../item.ts";
import type { Item, ItemSource } from "../item.ts";

const union = (
  values: readonly (readonly string[])[],
): readonly string[] => [...new Set(values.flat())];

/** The one value they all carry, or null where they disagree or there are none. */
function agreed(values: readonly (string | null)[]): string | null {
  const distinct = new Set(values);
  const [only] = distinct;

  return distinct.size === 1 && only !== undefined ? only : null;
}

/**
 * Everything the replaced rows already answered, carried onto the row replacing them.
 *
 * Only the category, the subcategory and the name are a decision. Class, tags and release
 * state are facts the game's data already stated, and restating them by hand is how a hand
 * file goes stale without anybody noticing.
 *
 * **An authored row is tradable, whatever it replaced.** `tradable` means the trade site
 * lists the name, and for the rows worth authoring it does — the site lists 145 blighted map
 * labels while RePoE files the concept as an untradable trade proxy. Reading the flag off
 * the proxy would answer a question about the proxy, not about the item.
 *
 * Conditions, variants and the price selector are copied off the entry the way
 * `classifyItems` copies them off a real row's, and resolved just as little.
 */
function fromReplaced(
  key: string,
  entry: TaxonomyAuthored,
  replaced: readonly Item[],
): Item {
  const sources = new Set<ItemSource>(replaced.flatMap((item) => item.sources));
  sources.add("authored");

  return {
    ...blankItem(key, entry.name),
    category: entry.category,
    subcategory: entry.subcategory,
    metadataPaths: union(replaced.map((item) => item.metadataPaths)),
    itemClass: agreed(replaced.map((item) => item.itemClass)),
    releaseState: agreed(replaced.map((item) => item.releaseState)),
    baseTypes: union(replaced.map((item) => item.baseTypes)),
    tags: union(replaced.map((item) => item.tags)),
    sources: [...sources],
    // The entry may say so itself, for a row that replaces nothing and is a unique anyway.
    isUnique:
      entry.isUnique ??
      (replaced.length > 0 && replaced.every((item) => item.isUnique)),
    tradable: true,
    tradedOnExchange: replaced.some((item) => item.tradedOnExchange),
    ...(entry.conditions === undefined ? {} : { conditions: entry.conditions }),
    ...(entry.variants === undefined ? {} : { variants: entry.variants }),
    ...(entry.price === undefined ? {} : { price: entry.price }),
  };
}

/**
 * Swaps every row an entry replaces for the one row it authors.
 *
 * The entries are the taxonomy's `authored` table, read off bronze like the rest of it: the
 * taxonomy is the one place a hand-written row is authored, and this only builds what it
 * says. The key is the entry's, so a variant authored against it lands on the row.
 *
 * Runs after the taxonomy, and the entry carries its own category, so an authored row is
 * never looked up and can never land in `unresolved.json`. It still has to pass
 * `isFilterable` — authoring a row is a way to say what the filter can write, not a way
 * around the rules about what it may write.
 *
 * **A `replaces` key the run does not have throws.** An entry that quietly matches nothing
 * leaves the rows it was written to collapse sitting in the output, and the report that
 * would have caught it is the one the entry silenced.
 */
export function applyAuthored(
  items: readonly Item[],
  authored: Readonly<Record<string, TaxonomyAuthored>>,
): readonly Item[] {
  const byKey = new Map(items.map((item) => [item.key, item]));
  const entries = Object.entries(authored);

  const rows = entries.map(([key, entry]) => {
    const keys = entry.replaces ?? [];

    const missing = keys.filter((replaced) => !byKey.has(replaced));
    if (missing.length > 0) {
      throw new Error(
        `Authored item ${entry.name} replaces ${missing.length} key(s) this run does not have: ${missing.join(", ")}`,
      );
    }

    return fromReplaced(
      key,
      entry,
      keys.flatMap((replaced) => byKey.get(replaced) ?? []),
    );
  });

  const replaced = new Set(entries.flatMap(([, entry]) => entry.replaces ?? []));

  return [...items.filter((item) => !replaced.has(item.key)), ...rows];
}
