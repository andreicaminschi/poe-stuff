import { resolveName } from "@poe/panel-state/resolve-name";
import { loosen, type NamedEntry } from "./list-named-entries.ts";

export type Span = readonly [number, number];
export type FuzzyMatch = { readonly span: Span; readonly entry: NamedEntry };

/** Windows shorter than this are never matched loosely, so common short words (many, like) never turn into names (Mana, Life). */
const MIN_LOOSE_LENGTH = 5;

/** Splits text into words with their positions: runs that start with a letter or digit and stop at spaces or sentence punctuation. */
const splitWords = (text: string): readonly Span[] =>
  [...text.matchAll(/[\p{L}\p{N}][^\s,.;:!?"]*/gu)].map((match) => [match.index, match.index + match[0].length] as const);

/** Tells whether a span overlaps any span already taken. */
const overlaps = (span: Span, taken: readonly Span[]): boolean => taken.some(([start, end]) => span[0] < end && span[1] > start);

/**
 * Finds names the request misspells: every run of words not already matched is compared with
 * the names of the same word count, through the same rule the executor resolves names with.
 * Longer runs go first, and a run that matches takes its words.
 *
 * @example
 * findFuzzyNames("tag rigns as chase", entries, []);
 * // → [{ span: [4, 9], entry: { name: "Rings", line: "seeder Rings: in Bases", … } }]
 */
export function findFuzzyNames(text: string, entries: readonly NamedEntry[], exact: readonly Span[]): readonly FuzzyMatch[] {
  const words = splitWords(text);
  const longest = Math.max(1, ...entries.map((entry) => entry.words));
  const taken: Span[] = [...exact];
  const found: FuzzyMatch[] = [];

  for (let size = Math.min(longest, words.length); size >= 1; size -= 1) {
    const sameSize = entries.filter((entry) => entry.words === size);
    for (let first = 0; first + size <= words.length; first += 1) {
      const span: Span = [words[first]![0], words[first + size - 1]![1]];
      const loose = loosen(text.slice(span[0], span[1]));
      if (loose.length < MIN_LOOSE_LENGTH || overlaps(span, taken)) continue;
      const close = sameSize.filter((entry) => Math.abs(entry.loose.length - loose.length) <= 2);
      const name = resolveName(loose, close.map((entry) => entry.loose));
      const entry = close.find((candidate) => candidate.loose === name);
      if (entry === undefined) continue;
      taken.push(span);
      found.push({ span, entry });
    }
  }
  return found;
}
