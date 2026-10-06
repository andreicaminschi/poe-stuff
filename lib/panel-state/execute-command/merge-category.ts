import type { PanelState } from "../types.ts";
import { resolveCategory } from "./find-seeder.ts";

export type MergeCategoryCommand = { readonly type: "mergeCategory"; readonly category: string; readonly into: string };

/** Moves every seeder of one category into another, then removes the emptied category. Either name may be misspelt. */
export function executeMergeCategory(state: PanelState, command: MergeCategoryCommand): PanelState {
  const source = resolveCategory(state, command.category);
  const target = resolveCategory(state, command.into);

  if (source === target) throw new Error(`Cannot merge "${source}" into itself.`);
  const seeders = { ...state.categories[target]?.seeders, ...state.categories[source]?.seeders };
  const merged = Object.keys(seeders).length === 0
    ? {}
    : { seeders };
  const kept = Object.entries(state.categories).filter(([name]) => name !== source);

  return {
    ...state,
    categories: Object.fromEntries(kept.map(([name, category]) => [name, name === target
      ? merged
      : category])),
  };
}
