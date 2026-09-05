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
 * **`tradable` says what the replaced rows said, and nothing more.** It means the trade site
 * lists the name, so writing `true` on a row the site has never heard of would answer a
 * different question than the one the field asks. Gold drops in every map and no market
 * will ever list it. What carries an authored row past that question is `isFilterable`,
 * which skips the obtainability test for a row a person vouched for.
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
    tradable: replaced.some((item) => item.tradable),
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
 * `isFilterable` — authoring a row answers whether a player can get one, and nothing else.
 * A removed item, a quest item or an excluded category is refused however it was written.
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
