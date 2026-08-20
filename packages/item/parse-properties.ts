/**
 * The `Key: Value` sections, and telling the leftovers apart.
 *
 * A section the game prints is one of four things and this file decides which by shape
 * alone: a `Key: Value` list, a row of sockets, a short bare line the caller might want
 * (`Corrupted`, `Shaper Item`, `Abyss`), or prose (flavour text, help text). None of that
 * needs a list of the words the game uses, which is the point — a flag the game invents next
 * league arrives in `flags` and nothing here has to be edited to let it through.
 */

import type { ItemProperty } from "./types.ts";

/**
 * A property line. The key is letters and spaces, so a sentence with a colon in the middle
 * of it is not mistaken for one — the game's help text has commas and digits in it and a
 * property key never does.
 */
const PAIR = /^([A-Za-z][A-Za-z '-]*(?:\s*\([^)]*\))?):\s*(.*)$/;

/** The qualifier the game brackets onto a key: `Quality (Attribute Modifiers)`. */
const QUALIFIER = /^(.*?)\s*\(([^)]*)\)$/;

/** A number, once the thousands commas are out of the way. */
const NUMBER = /-?\d+(?:\.\d+)?/g;

/** A comma standing between two digits, which is a thousands separator and nothing else. */
const THOUSANDS = /(?<=\d),(?=\d)/g;

/**
 * The lowercase suffix the game puts on a modifier it prints outside a `{ … }` header:
 * `Allocates Discipline and Training (enchant)`. The trade site's own export writes every
 * modifier this way, so reading it here is also the one piece of that format this package
 * understands.
 */
const SUFFIX_KIND = /^(.*?)\s+\(([a-z]+)\)$/;

/** How many words a line may have and still be a flag rather than prose. */
const FLAG_WORDS = 4;

/** Sentence punctuation. A line ending in one of these is prose, however short it is. */
const SENTENCE_END = /[.,;:!?]$/;

/** Whether a bare line reads as a flag — something short, named, and not a sentence. */
export const isFlagLine = (line: string) =>
  !SENTENCE_END.test(line) && line.split(/\s+/).length <= FLAG_WORDS;

/** Whether a bare line is a modifier the game suffixed rather than headed. */
export const suffixedMod = (line: string) => {
  const match = SUFFIX_KIND.exec(line);
  return match === null ? undefined : { text: match[1] ?? "", kind: match[2] ?? "" };
};

/** Whether a section is a `Key: Value` list rather than bare lines. */
export const hasPairs = (lines: readonly string[]) => lines.some((line) => PAIR.test(line));

/**
 * One `Key: Value` line, or `undefined` when the line is not one.
 *
 * The `(augmented)` and `(unmet)` markers are taken off the value and turned into flags,
 * because they say something about the number rather than being part of it.
 */
export function parseProperty(line: string): ItemProperty | undefined {
  const pair = PAIR.exec(line);
  if (pair === null) return undefined;

  const key = pair[1] ?? "";
  const raw = pair[2] ?? "";
  const qualified = QUALIFIER.exec(key);

  const augmented = raw.includes("(augmented)");
  const unmet = raw.includes("(unmet)");
  const value = raw.replace(/\s*\((?:augmented|unmet)\)/g, "").trim();

  return {
    name: qualified?.[1] ?? key,
    value,
    qualifier: qualified?.[2] ?? "",
    augmented,
    unmet,
    numbers: (value.replace(THOUSANDS, "").match(NUMBER) ?? []).map(Number),
  };
}

/**
 * The linked groups of a `Sockets:` value.
 *
 * `R-G-B B-B` is a linked red-green-blue and a linked pair of blues, which is `["RGB",
 * "BB"]` — spaces separate groups, hyphens join within one. `D D D` is three unlinked
 * sockets. This is the same reading `@poe/filter-eval` puts on its item's sockets, so the
 * adapter only has to join them with a space.
 */
export const parseSockets = (value: string) =>
  value
    .split(/\s+/)
    .filter((group) => group !== "")
    .map((group) => group.split("-").join(""));
