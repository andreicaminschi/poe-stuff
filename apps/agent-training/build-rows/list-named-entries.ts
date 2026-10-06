import type { PanelState } from "@poe/panel-state/types";

/** One name the state holds, its context line, and its form for loose comparison. */
export type NamedEntry = { readonly name: string; readonly line: string; readonly loose: string; readonly words: number };

/** Lowercases a phrase and drops the punctuation a person often leaves out, so "Grip (Shock, Debil)" compares to "grip (shock debil)". */
export const loosen = (text: string): string => text.toLowerCase().replace(/[,.;:!?"]/g, " ").replace(/\s+/g, " ").trim();

/** Builds one entry. */
function buildEntry(name: string, line: string): NamedEntry {
  const loose = loosen(name);
  return { name, line, loose, words: loose.split(" ").length };
}

const categoryEntries = new WeakMap<PanelState["categories"], readonly NamedEntry[]>();
const itemEntries = new WeakMap<PanelState["items"], readonly NamedEntry[]>();

/** Lists the categories and seeders, cached per categories map: commands copy only what they change, so unchanged maps repeat. */
function listCategoryEntries(categories: PanelState["categories"]): readonly NamedEntry[] {
  const cached = categoryEntries.get(categories);
  if (cached !== undefined) return cached;

  const entries = [
    ...Object.entries(categories).map(([name, category]) => buildEntry(name, `category ${name}: ${Object.keys(category.seeders ?? {}).length} seeders`)),
    ...Object.entries(categories).flatMap(([category, entry]) => Object.keys(entry.seeders ?? {}).map((name) => buildEntry(name, `seeder ${name}: in ${category}`))),
  ];
  categoryEntries.set(categories, entries);
  return entries;
}

/** Lists the items, cached per items map. */
function listItemEntries(items: PanelState["items"]): readonly NamedEntry[] {
  const cached = itemEntries.get(items);
  if (cached !== undefined) return cached;

  const entries = Object.keys(items).map((name) => buildEntry(name, `item ${name}: exists`));
  itemEntries.set(items, entries);
  return entries;
}

/** Lists every name the state holds with its existence line, longest name first. */
export const listNamedEntries = (state: PanelState): readonly NamedEntry[] =>
  [...listCategoryEntries(state.categories), ...listItemEntries(state.items)].sort((left, right) => right.name.length - left.name.length);
