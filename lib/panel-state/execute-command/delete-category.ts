import type { PanelState } from "../types.ts";
import { requireCategory } from "./find-seeder.ts";

export type DeleteCategoryCommand = { readonly type: "deleteCategory"; readonly category: string };

/** Removes a category and every seeder in it. Throws when it does not exist. */
export function executeDeleteCategory(state: PanelState, command: DeleteCategoryCommand): PanelState {
  requireCategory(state, command.category);
  return { ...state, categories: Object.fromEntries(Object.entries(state.categories).filter(([name]) => name !== command.category)) };
}
