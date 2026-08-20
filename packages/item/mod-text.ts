/**
 * Reading the numbers out of a line of modifier text, and writing the line the way GGG
 * publishes it.
 *
 * The game and the trade API disagree about one thing and only one thing: the game prints
 * what a modifier rolled next to the range it rolled in — `+149(145-159) to maximum Life` —
 * and the trade API publishes `+# to maximum Life`. `@util/core/stat-index` already turns
 * both into a key, but it was written for two GGG sources that both spell the range out,
 * and it reduces the game's notation to `+## to maximum life`, which matches nothing.
 * Taking the bracketed range off first is what closes that gap.
 */

import type { ModRoll } from "./types.ts";

/**
 * A roll: a number with the range it came from bracketed onto it. `+149(145-159)`,
 * `22(25-20)` — the game writes a range backwards when the modifier is a downside —
 * `1.5(1-2)`, and `-10(-25--15)`.
 */
const ROLL = /(-?\d+(?:\.\d+)?)\((-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?)\)/g;

/** The note the game appends to a value the passive tree will not scale. */
const UNSCALABLE = / — Unscalable Value$/;

/** The line with each roll's bracketed range removed, leaving the value that was rolled. */
export const derollText = (text: string) => text.replace(ROLL, "$1");

/**
 * Every roll on the line, in the order printed.
 *
 * Only rolls the game bracketed are read. A bare number is left alone because nothing in
 * the text says whether it is a roll or part of the wording — `for 4 seconds` and
 * `+2 to Level of Socketed Support Gems` are the same shape — and the numbers a stat
 * actually searches on come from aligning the published stat text instead.
 *
 * `min` and `max` are sorted, so a backwards range reads the same way as any other.
 */
export function readRolls(text: string): readonly ModRoll[] {
  const rolls: ModRoll[] = [];

  for (const [, value, first, second] of text.matchAll(ROLL)) {
    const low = Number(first);
    const high = Number(second);

    rolls.push({
      value: Number(value),
      min: Math.min(low, high),
      max: Math.max(low, high),
    });
  }

  return rolls;
}

/** The line without its `— Unscalable Value` note, and whether it had one. */
export function stripUnscalable(text: string): {
  readonly text: string;
  readonly unscalable: boolean;
} {
  const stripped = text.replace(UNSCALABLE, "");
  return { text: stripped, unscalable: stripped !== text };
}

/**
 * The same modifier written the way GGG indexes it, or `undefined` when it already is.
 *
 * GGG publishes one direction of a scaling modifier and searches the other with a negative
 * value: there is a `#% increased Charges per use` and no `reduced` counterpart, so a flask
 * printing `28% reduced Charges per use` is stat `#% increased Charges per use` at `-28`.
 * The same holds for `less` against `more`.
 *
 * This is only ever tried after the printed wording has already missed, so a modifier GGG
 * does publish in the reduced direction is never rewritten out from under itself.
 */
export function invertScaling(text: string): string | undefined {
  const flipped = text
    .replace(/(-?\d+(?:\.\d+)?)((?:%)? )reduced /g, (_, value: string, gap: string) => `${-Number(value)}${gap}increased `)
    .replace(/(-?\d+(?:\.\d+)?)((?:%)? )less /g, (_, value: string, gap: string) => `${-Number(value)}${gap}more `);

  return flipped === text ? undefined : flipped;
}
