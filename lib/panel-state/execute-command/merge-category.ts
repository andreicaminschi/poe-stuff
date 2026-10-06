import type { PanelState } from "../types.ts";
import { requireCategory } from "./find-seeder.ts";

export type MergeCategoryCommand = { readonly type: "mergeCategory"; readonly category: string; readonly into: string };

/** Moves every seeder of one category into another, then removes the emptied category. */
export function executeMergeCategory(state: PanelState, command: MergeCategoryCommand): PanelState {
  const source = requireCategory(state, command.category);
  const target = requireCategory(state, command.into);

  if (command.category === command.into) throw new Error(`Cannot merge "${command.category}" into itself.`);
  const seeders = { ...target.seeders, ...source.seeders };
  const merged = Object.keys(seeders).length === 0
    ? {}
    : { seeders };
  const kept = Object.entries(state.categories).filter(([name]) => name !== command.category);

  return {
    ...state,
    categories: Object.fromEntries(kept.map(([name, category]) => [name, name === command.into
      ? merged
      : category])),
  };
}
