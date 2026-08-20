/**
 * The modifier sections: a `{ … }` header and the lines under it.
 *
 * The header is read for structure, never matched against a list of the words GGG uses.
 * `Master Crafted Prefix Modifier "Upgraded" — Gem` is: some words, one of which says where
 * the modifier sits; a quoted affix name; a bracketed tier; and `—` clauses. A header
 * carrying a word this package has never seen still parses, and the word lands in
 * `qualifiers` where the stat matcher gets a chance to recognise it later.
 *
 * Lines under a header are the modifier's text — several of them when it is a hybrid, and
 * GGG publishes those joined, which is why they are kept together rather than split into a
 * modifier each. A line the game wraps in parentheses is reminder text: an explanation of
 * the modifier above, not a modifier.
 */

import { readRolls, stripUnscalable } from "./mod-text.ts";
import type { Affix, ItemMod, ModHeader, ModLine } from "./types.ts";

/** A header line: everything between the braces. */
const HEADER = /^\{\s*(.*?)\s*\}$/;

/** The clause separator inside a header. An em dash, the way the game writes it. */
const CLAUSE = "\u2014";

/** The affix name the game quotes. */
const QUOTED = /"([^"]*)"/;

/** The tier the game brackets. */
const TIER = /\(Tier:\s*(\d+)\)/;

/** Reminder text: the whole line wrapped in parentheses. */
const REMINDER = /^\(.*\)$/;

/** The word every header ends its declaration with. Everything before it says what kind. */
const KIND_WORD = "Modifier";

/** Which word decides where the modifier sits. Anything else is a qualifier. */
const AFFIX_WORDS: Readonly<Record<string, Affix>> = {
  prefix: "prefix",
  suffix: "suffix",
  implicit: "implicit",
};

/** Whether a line opens a modifier. */
export const isModHeader = (line: string) => HEADER.test(line);

/** Reads a `{ … }` line. `raw` keeps the contents verbatim for anything this misses. */
export function parseModHeader(line: string): ModHeader {
  const raw = HEADER.exec(line)?.[1] ?? line;
  const [declaration = "", ...clauses] = raw.split(CLAUSE).map((part) => part.trim());

  const name = QUOTED.exec(declaration)?.[1] ?? "";
  const tier = TIER.exec(declaration)?.[1];

  const words = declaration
    .replace(QUOTED, "")
    .replace(TIER, "")
    .split(/\s+/)
    .filter((word) => word !== "" && word !== KIND_WORD);

  const affix = words.map((word) => AFFIX_WORDS[word.toLowerCase()]).find((found) => found !== undefined);

  return {
    raw,
    affix: affix ?? "other",
    name,
    tier: tier === undefined ? undefined : Number(tier),
    tags: (clauses[0] ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag !== ""),
    qualifiers: words.filter((word) => AFFIX_WORDS[word.toLowerCase()] === undefined),
    extra: clauses.slice(1),
  };
}

/** One line of modifier text, with its rolls read and its unscalable note taken off. */
export function parseModLine(line: string): ModLine {
  const { text, unscalable } = stripUnscalable(line);
  return { text, rolls: readRolls(text), unscalable };
}

/**
 * Every modifier in a section.
 *
 * A line before the first header would be a modifier with nothing saying what it is, which
 * the advanced format never prints. It is dropped here and reported by the caller.
 */
export function parseModSection(lines: readonly string[]): {
  readonly mods: readonly ItemMod[];
  readonly orphans: readonly string[];
} {
  const mods: { header: ModHeader; lines: ModLine[]; reminders: string[] }[] = [];
  const orphans: string[] = [];

  for (const line of lines) {
    if (isModHeader(line)) {
      mods.push({ header: parseModHeader(line), lines: [], reminders: [] });
      continue;
    }

    const current = mods[mods.length - 1];
    if (current === undefined) {
      orphans.push(line);
      continue;
    }

    if (REMINDER.test(line)) current.reminders.push(line);
    else current.lines.push(parseModLine(line));
  }

  return { mods, orphans };
}

/**
 * A modifier the game printed with a lowercase suffix instead of a header —
 * `Allocates Discipline and Training (enchant)`.
 *
 * The suffix becomes the header's one qualifier, so the stat matcher reads it exactly the
 * way it reads `Master Crafted`: a word to look for among the stat types GGG publishes.
 */
export function suffixMod(text: string, kind: string): ItemMod {
  return {
    header: {
      raw: kind,
      affix: AFFIX_WORDS[kind] ?? "other",
      name: "",
      tier: undefined,
      tags: [],
      qualifiers: [kind],
      extra: [],
    },
    lines: [parseModLine(text)],
    reminders: [],
  };
}
