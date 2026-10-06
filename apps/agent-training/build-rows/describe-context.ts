import type { PanelState } from "@poe/panel-state/types";

type NamedEntry = { readonly name: string; readonly line: string };

/** Lists every name the state holds, each with its existence line. */
function listNamedEntries(state: PanelState): readonly NamedEntry[] {
  const categories = Object.entries(state.categories).map(([name, category]) => ({ name, line: `category ${name}: ${Object.keys(category.seeders ?? {}).length} seeders` }));
  const seeders = Object.entries(state.categories).flatMap(([category, entry]) => Object.keys(entry.seeders ?? {}).map((name) => ({ name, line: `seeder ${name}: in ${category}` })));
  const items = Object.keys(state.items).map((name) => ({ name, line: `item ${name}: exists` }));

  return [...categories, ...seeders, ...items];
}

/** Tells whether a character is part of a word, so a name only matches whole. */
const isWordCharacter = (character: string | undefined): boolean => character !== undefined && /[\p{L}\p{N}]/u.test(character);

/** Finds where a name stands as a whole phrase in the text, skipping spans a longer name already took. */
function findFreeMatch(text: string, name: string, taken: readonly (readonly [number, number])[]): readonly [number, number] | undefined {
  const needle = name.toLowerCase();
  let from = text.indexOf(needle);

  while (from !== -1) {
    const to = from + needle.length;
    const whole = !isWordCharacter(text[from - 1]) && !isWordCharacter(text[to]);
    const free = taken.every(([start, end]) => to <= start || from >= end);
    if (whole && free) return [from, to];
    from = text.indexOf(needle, from + 1);
  }
  return undefined;
}

/**
 * Describes every category, seeder and item the request names, as the models see the state:
 * existence only, what each name is and where it sits. Longer names match first, so "Elder Maps"
 * does not also count as the category "Maps". A name the state does not hold gets no line.
 *
 * @example
 * describeContext("Tag every seeder in Bases except Amulets as chase", state);
 * // → ["category Bases: 25 seeders", "seeder Amulets: in Bases"]
 */
export function describeContext(request: string, state: PanelState): readonly string[] {
  const text = request.toLowerCase();
  const entries = [...listNamedEntries(state)].sort((left, right) => right.name.length - left.name.length);
  const taken: (readonly [number, number])[] = [];
  const found: { readonly at: number; readonly line: string }[] = [];

  for (const entry of entries) {
    const match = findFreeMatch(text, entry.name, taken);
    if (match === undefined) continue;
    taken.push(match);
    found.push({ at: match[0], line: entry.line });
  }
  return found.sort((left, right) => left.at - right.at).map((entry) => entry.line);
}
