import type { Command } from "@poe/panel-state/execute-command";
import { createFaker, deriveSeed } from "./derive-seed.ts";

/** Share of requests that get typos. */
const TYPO_SHARE = 0.25;

type Span = readonly [number, number];

/** Lists every string a set of commands carries: names, tags, items, values, and condition names. The command's own vocabulary (`type`, `target`) is left out. */
function collectStrings(value: unknown, key: string | undefined): readonly string[] {
  if (typeof value === "string") return key === "type" || key === "target"
    ? []
    : [value];
  if (Array.isArray(value)) return value.flatMap((entry) => collectStrings(entry, undefined));
  if (typeof value !== "object" || value === null) return [];
  return Object.entries(value).flatMap(([name, child]) => [...(key === "conditions"
    ? [name]
    : []), ...collectStrings(child, name)]);
}

/** Lists the strings a goal's commands carry, the dynamic values a typo must never touch. */
export const listProtectedStrings = (commands: readonly Command[]): readonly string[] =>
  [...new Set(commands.flatMap((command) => collectStrings(command, undefined)))].filter((text) => text.length > 0);

/** Lists the stored names the request mentions, ignoring case, so a name the commands don't carry is protected too. */
export const listMentionedNames = (request: string, names: readonly string[]): readonly string[] => {
  const text = request.toLowerCase();
  return names.filter((name) => text.includes(name.toLowerCase()));
};

/** Finds every place a protected string stands in the request, ignoring case. */
function findProtectedSpans(request: string, strings: readonly string[]): readonly Span[] {
  const text = request.toLowerCase();

  return strings.flatMap((value) => {
    const needle = value.toLowerCase();
    const spans: Span[] = [];
    for (let from = text.indexOf(needle); from !== -1; from = text.indexOf(needle, from + 1)) spans.push([from, from + needle.length]);
    return spans;
  });
}

/** Misspells one word the way fingers do: two letters swapped, one dropped, one doubled, or an apostrophe lost. */
function misspellWord(word: string, seed: number): string {
  const faker = createFaker(seed);
  const at = faker.number.int({ min: 1, max: word.length - 2 });
  const apostrophe = word.indexOf("'");
  const edits = [
    () => `${word.slice(0, at)}${word[at + 1] ?? ""}${word[at] ?? ""}${word.slice(at + 2)}`,
    () => `${word.slice(0, at)}${word.slice(at + 1)}`,
    () => `${word.slice(0, at)}${word[at] ?? ""}${word.slice(at)}`,
    ...(apostrophe === -1
      ? []
      : [() => `${word.slice(0, apostrophe)}${word.slice(apostrophe + 1)}`]),
  ];
  const misspelt = faker.helpers.arrayElement(edits)();

  return misspelt === word
    ? `${word.slice(0, at)}${word.slice(at + 1)}`
    : misspelt;
}

/**
 * Puts one or two typos into one request in four, in its fixed template words only. Every word
 * inside a protected string (a name, tag, item or value the commands carry) stays exactly as
 * written, so the models learn to read past sloppy wording but never to guess at a name.
 *
 * @example
 * garbleRequest("Give Rings the chase tag", ["Rings", "chase"], 3);
 * // → "Gvie Rings the chase tag" (or unchanged, for three seeds in four)
 */
export function garbleRequest(request: string, protectedStrings: readonly string[], seed: number): string {
  const faker = createFaker(deriveSeed(seed, "share"));
  if (!faker.datatype.boolean({ probability: TYPO_SHARE })) return request;

  const spans = findProtectedSpans(request, protectedStrings);
  const words = [...request.matchAll(/[A-Za-z']{4,}/g)]
    .map((match) => [match.index, match.index + match[0].length] as const)
    .filter(([start, end]) => spans.every(([from, to]) => end <= from || start >= to));
  const chosen = faker.helpers.arrayElements(words as Span[], { min: Math.min(1, words.length), max: Math.min(2, words.length) }).sort((left, right) => right[0] - left[0]);

  return chosen.reduce((text, [start, end], index) => `${text.slice(0, start)}${misspellWord(text.slice(start, end), deriveSeed(seed, `word-${index}`))}${text.slice(end)}`, request);
}
