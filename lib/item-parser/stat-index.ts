/**
 * A lookup from a line of item text to every stat that could be searching for it.
 *
 * The problem this solves is that two sources write the same modifier differently. One
 * spells the roll out — `Adds (2-3) to (4-5) Cold Damage` — and the other writes the
 * placeholder the search engine indexes — `Adds # to # Cold Damage`. Everything else
 * about the line is identical, so the join is an exact match once both sides are written
 * the same way.
 *
 * Placeholders rather than patterns: every text is reduced to one key when the index is
 * built, and a lookup is a hash hit. Matching a line against thousands of regexes would
 * answer the same question by walking the whole list every time.
 */
export type StatIndex<T> = {
  /**
   * Every item whose text reduces to the same key, in insertion order. Empty when
   * nothing does.
   *
   * More than one is normal rather than a failure: GGG publishes the same line several
   * times over — `Socketed Gems are Supported by Level # Chance To Bleed` exists three
   * times, differing only in capitals — and an item indexed under one of them is not
   * found by the others. Which is why they are all returned.
   */
  find(text: string): readonly T[];
};

/** A bracketed roll: `(2-3)`, `(-25--15)`, `(1.5-2)`. */
const RANGE = /\([-\d.]+(?:\s*-\s*-?[\d.]+)?\)/g;

/** Any number left over once the ranges are gone, sign and decimals included. */
const NUMBER = /-?\d+(?:\.\d+)?/g;

/**
 * The article standing in for a count. The game writes `an additional Arrow` where the
 * search engine writes `# additional Arrows`, so the article is a number that happens to
 * be spelled.
 */
const ARTICLE = /(?<=^|\s)an?(?=\s)/g;

/**
 * The sign glued to a placeholder. GGG writes the sign into the stat text — \, \ — and searches the same stat with a negative
 * value, where the game prints the sign as part of the roll. So the sign belongs to the
 * number, and the number is already a \.
 */
const SIGN = /[+-]#/g;

/** A trailing plural `s`, but not the `s` of `less`, `Charges`' stem, or a bare `s`. */
const PLURAL = /(?<=[a-z]{2})(?<![s])s(?=\s|$)/g;

/**
 * One line of item text as a key: whitespace collapsed, case dropped, every number a
 * `#`, every spelled article a `#`, and plurals reduced to their stem.
 *
 * Each rule is applied to both sides of the join, which is what keeps the crude ones
 * safe. Blanking a literal number — the `10` in `per 10 Dexterity` — loses the
 * difference between two stats that differ only there, and stemming `Arrows` to `Arrow`
 * can merge a singular stat with its plural. Neither loses a match: the two sides still
 * land on the same key, and the merge shows up as several candidates rather than a wrong
 * one.
 *
 * The newline a hybrid modifier carries is whitespace like any other. The two sources
 * disagree about it often enough that keeping it would cost matches and buy nothing.
 */
export const statKey = (text: string) =>
  text
    .replace(RANGE, "#")
    .replace(NUMBER, "#")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(ARTICLE, "#")
    .replace(SIGN, "#")
    .replace(PLURAL, "");

/**
 * Indexes `items` by their text. Every item sharing a key is kept, in the order it
 * arrived — the caller decides what several candidates mean, because only it knows
 * whether they are duplicates of one search or two different modifiers.
 *
 * Which items go in is also the caller's decision. GGG publishes the same line under
 * several stat types — explicit, implicit, fractured, crafted — and choosing between
 * them here would be this file inventing a preference it cannot see.
 */
export function statIndex<T>(
  items: Iterable<T>,
  textOf: (item: T) => string,
): StatIndex<T> {
  const byKey = new Map<string, T[]>();

  for (const item of items) {
    const key = statKey(textOf(item));
    const seen = byKey.get(key);
    if (seen === undefined) byKey.set(key, [item]);
    else seen.push(item);
  }

  return { find: (text) => byKey.get(statKey(text)) ?? [] };
}
