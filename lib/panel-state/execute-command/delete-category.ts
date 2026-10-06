import type { PanelState } from "../types.ts";
import { resolveCategory } from "./find-seeder.ts";

export type DeleteCategoryCommand = { readonly type: "deleteCategory"; readonly category: string };

/** Removes a category and every seeder in it. Throws when no category matches the name. */
export function executeDeleteCategory(state: PanelState, command: DeleteCategoryCommand): PanelState {
  const category = resolveCategory(state, command.category);
  return { ...state, categories: Object.fromEntries(Object.entries(state.categories).filter(([name]) => name !== category)) };
}
