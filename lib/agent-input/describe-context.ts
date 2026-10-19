import type { PanelState } from "@poe/panel-state/types";
import { findFuzzyNames, type Span } from "./find-fuzzy-names.ts";
import { listNamedEntries } from "./list-named-entries.ts";

/** Tells whether a character is part of a word, so a name only matches whole. A hyphen joins a word, so "red-maps" never contains "Maps". */
const isWordCharacter = (character: string | undefined): boolean => character !== undefined && /[\p{L}\p{N}-]/u.test(character);

/** Finds where a name stands as a whole phrase in the text, skipping spans a longer name already took. */
function findFreeMatch(text: string, name: string, taken: readonly Span[]): Span | undefined {
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
 * existence only, what each name is and where it sits. Exact names match first, longest first,
 * so "Elder Maps" does not also count as the category "Maps". Then misspelt names match through
 * the executor's own rule, and the line shows the stored spelling. A name the state does not
 * hold, and nothing close to it, gets no line.
 *
 * @example
 * describeContext("Tag every seeder in Bases except amulest as chase", state);
 * // → ["category Bases: 25 seeders", "seeder Amulets: in Bases"]
 */
export function describeContext(request: string, state: PanelState): readonly string[] {
  const byItems = contexts.get(state.categories) ?? new WeakMap<PanelState["items"], Map<string, readonly string[]>>();
  const byRequest = byItems.get(state.items) ?? new Map<string, readonly string[]>();
  const cached = byRequest.get(request);
  if (cached !== undefined) return cached;

  const lines = buildContext(request, state);
  byRequest.set(request, lines);
  byItems.set(state.items, byRequest);
  contexts.set(state.categories, byItems);
  return lines;
}

/** Remembers each request's context per state, so the Router and Filler rows of one step share one match. */
const contexts = new WeakMap<PanelState["categories"], WeakMap<PanelState["items"], Map<string, readonly string[]>>>();

/** Matches the request's names against the state: exact names first, then misspelt ones. */
function buildContext(request: string, state: PanelState): readonly string[] {
  const text = request.toLowerCase();
  const entries = listNamedEntries(state);
  const taken: Span[] = [];
  const found: { readonly at: number; readonly line: string }[] = [];
  const named = new Set<string>();

  for (const entry of entries) {
    const match = findFreeMatch(text, entry.name, taken);
    if (match === undefined) continue;
    taken.push(match);
    named.add(entry.line);
    found.push({ at: match[0], line: entry.line });
  }
  const unnamed = entries.filter((entry) => !named.has(entry.line));
  const fuzzy = findFuzzyNames(text, unnamed, taken).map(({ span, entry }) => ({ at: span[0], line: entry.line }));
  return [...found, ...fuzzy].sort((left, right) => left.at - right.at).map((entry) => entry.line);
}
