import { createFaker, deriveSeed } from "./derive-seed.ts";

/** Joins names the way a person lists them: "A", "A and B", "A, B and C". */
export function formatList(names: readonly string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1) ?? ""}`;
}

/** Writes a name as typed: mostly as stored, sometimes all lowercase. */
export const varyName = (name: string, seed: number): string =>
  (createFaker(seed).datatype.boolean({ probability: 0.3 })
    ? name.toLowerCase()
    : name);

/** Writes several names as typed, then joins them. */
export const formatNames = (names: readonly string[], seed: number): string =>
  formatList(names.map((name, index) => varyName(name, deriveSeed(seed, `name-${index}`))));

/** Picks one wording and fills it. */
export const pickWording = (wordings: readonly (() => string)[], seed: number): string =>
  createFaker(seed).helpers.arrayElement(wordings as (() => string)[])();

/** Writes a noun with its indefinite article: "a Ring", "an Agile Ring". */
export const withArticle = (noun: string): string => `${/^[aeiou]/i.test(noun)
  ? "an"
  : "a"} ${noun}`;

/** Lowercases the first letter, so a request can follow another in one sentence. */
export const lowerFirst = (text: string): string => `${text.charAt(0).toLowerCase()}${text.slice(1)}`;
