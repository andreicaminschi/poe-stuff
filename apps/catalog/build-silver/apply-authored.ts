import { readFileSync } from "node:fs";
import { blankItem } from "../item.ts";
import type { Item, ItemSource } from "../item.ts";
import { slug } from "../lake/keys.ts";

/**
 * A row somebody wrote by hand, because no arrangement of the sources produces it.
 *
 * `replaces` names the rows it stands in for and may be left out. With it, several rows a
 * filter cannot tell apart collapse into the one row it can write. Without it, the entry is
 * a row no source has at all — a flag the game matches on rather than a base type.
 *
 * `reason` is the point of the file. A hand-written row with no reason records that
 * somebody decided, not what they decided.
 */
export type AuthoredItem = {
  readonly name: string;
  readonly category: string;
  readonly subcategory: string | null;
  readonly replaces?: readonly string[];
  readonly reason: string;
};

/**
 * The hand-written rows, read rather than compiled in so they can be edited with `jq`.
 */
export const authoredItems = (): readonly AuthoredItem[] =>
  JSON.parse(
    readFileSync(new URL("authored-items.json", import.meta.url), "utf8"),
  ) as AuthoredItem[];

/** `authored/vaal-aspect`. Its own namespace, so it can never collide with a metadata id. */
export const authoredKey = (name: string): string => `authored/${slug(name)}`;

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
 */
function fromReplaced(entry: AuthoredItem, replaced: readonly Item[]): Item {
  const sources = new Set<ItemSource>(replaced.flatMap((item) => item.sources));
  sources.add("authored");

  return {
    ...blankItem(authoredKey(entry.name), entry.name),
    category: entry.category,
    subcategory: entry.subcategory,
    metadataPaths: union(replaced.map((item) => item.metadataPaths)),
    itemClass: agreed(replaced.map((item) => item.itemClass)),
    releaseState: agreed(replaced.map((item) => item.releaseState)),
    baseTypes: union(replaced.map((item) => item.baseTypes)),
    tags: union(replaced.map((item) => item.tags)),
    sources: [...sources],
    isUnique: replaced.length > 0 && replaced.every((item) => item.isUnique),
    tradable: true,
    tradedOnExchange: replaced.some((item) => item.tradedOnExchange),
  };
}

/**
 * Swaps every row an entry replaces for the one row it authors.
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
  authored: readonly AuthoredItem[],
): readonly Item[] {
  const byKey = new Map(items.map((item) => [item.key, item]));

  const rows = authored.map((entry) => {
    const keys = entry.replaces ?? [];

    const missing = keys.filter((key) => !byKey.has(key));
    if (missing.length > 0) {
      throw new Error(
        `Authored item ${entry.name} replaces ${missing.length} key(s) this run does not have: ${missing.join(", ")}`,
      );
    }

    return fromReplaced(
      entry,
      keys.flatMap((key) => byKey.get(key) ?? []),
    );
  });

  const replaced = new Set(authored.flatMap((entry) => entry.replaces ?? []));

  return [...items.filter((item) => !replaced.has(item.key)), ...rows];
}
