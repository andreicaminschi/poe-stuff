import type { PanelState } from "../types.ts";
import { resolveCategory } from "./find-seeder.ts";

export type DeleteCategoryCommand = { readonly type: "deleteCategory"; readonly category: string };

/** Removes a category, every seeder in it and their tags. Throws when no category matches the name. */
export function executeDeleteCategory(state: PanelState, command: DeleteCategoryCommand): PanelState {
  const category = resolveCategory(state, command.category);
  const deleted = Object.keys(state.categories[category]?.seeders ?? {});

  return {
    ...state,
    categories: Object.fromEntries(Object.entries(state.categories).filter(([name]) => name !== category)),
    seederTags: Object.fromEntries(Object.entries(state.seederTags).filter(([seeder]) => !deleted.includes(seeder))),
  };
}
