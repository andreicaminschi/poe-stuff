import type { Category, ConditionValue } from "./types.ts";

const MAX_LISTED = 8;
const MAX_RESULTS = 10;

export type FoundSeeder = {
  readonly category: string;
  readonly seeder: string;
  readonly tags: readonly string[];
  readonly knownItems?: readonly string[];
  readonly conditions: Readonly<Record<string, readonly ConditionValue[]>>;
  readonly more?: Readonly<Record<string, number>>;
};

const SKIPPED_WORDS = new Set(["a", "an", "the", "of", "to", "on", "in", "and", "for"]);

/** Splits text into lowercase words, plural `s` dropped. Low, Sonar 0. */
const readWords = (text: string): readonly string[] =>
  text.toLowerCase().split(/[^a-z0-9']+/).filter((word) => word !== "" && !SKIPPED_WORDS.has(word)).map((word) => word.replace(/s$/, ""));

/** Counts the query words found in a list of words. Low, Sonar 0. */
const countHits = (query: readonly string[], words: readonly string[]): number =>
  query.filter((word) => words.includes(word)).length;

/** Cuts long lists to `MAX_LISTED` and counts what was cut. Low, Sonar 1. */
function summarize(category: string, seeder: Category["seeders"][number]): FoundSeeder {
  const lists: readonly (readonly [string, readonly ConditionValue[]])[] = Object.entries(seeder.conditions);
  const more = Object.fromEntries([
    ...lists.filter(([, values]) => values.length > MAX_LISTED).map(([key, values]) => [key, values.length - MAX_LISTED]),
    ...((seeder.knownItems ?? []).length > MAX_LISTED
      ? [["knownItems", (seeder.knownItems ?? []).length - MAX_LISTED]]
      : []),
  ]);

  return {
    category,
    seeder: seeder.name,
    tags: seeder.tags,
    ...(seeder.knownItems === undefined
      ? {}
      : { knownItems: seeder.knownItems.slice(0, MAX_LISTED) }),
    conditions: Object.fromEntries(lists.map(([key, values]) => [key, values.slice(0, MAX_LISTED)])),
    ...(Object.keys(more).length === 0
      ? {}
      : { more }),
  };
}

/** Scores one seeder: an exact known item, then name words, then fewest unmatched name words, then known items. Low, Sonar 2. */
function scoreSeeder(query: readonly string[], category: string, seeder: Category["seeders"][number]): number {
  const nameWords = [...new Set(readWords(`${category} ${seeder.name}`))];
  const itemWords = (seeder.knownItems ?? []).map(readWords);
  const itemHits = Math.max(0, ...itemWords.map((words) => countHits(query, words)));
  const nameHits = countHits(query, nameWords);

  if (itemWords.some((words) => words.join(" ") === query.join(" "))) return 1_000_000;
  if (nameHits === 0) return itemHits;

  return (nameHits * 1000) - (nameWords.filter((word) => !query.includes(word)).length * 10) + itemHits;
}

/**
 * Finds the seeders a short text names. A text that is exactly a known item wins outright. After
 * that, a word matching the category or seeder name outweighs everything else, ties go to the name with the fewest words the text leaves out, and known
 * items break what is left. Returns every seeder tied at the best score, long lists cut short, or nothing
 * when no word matches. Low, Sonar 1.
 *
 * @example
 * findSeeders(categories, "unique cloth belt");
 * // → Cloth Belt Uniques in Uniques; Foulborn Uniques loses on the unmatched "foulborn"
 */
export function findSeeders(categories: readonly Category[], text: string): readonly FoundSeeder[] {
  const query = readWords(text);
  const scored = categories.flatMap((category) => category.seeders.map((seeder) => ({
    category: category.name,
    seeder,
    score: scoreSeeder(query, category.name, seeder),
  })));
  const best = Math.max(0, ...scored.map((at) => at.score));

  if (best <= 0) return [];

  return scored.filter((at) => at.score === best).slice(0, MAX_RESULTS).map((at) => summarize(at.category, at.seeder));
}
