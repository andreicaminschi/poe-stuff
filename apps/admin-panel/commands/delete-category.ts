import { requireCategory, withEntry, type Stamp } from "../panel-state.ts";
import type { PanelState } from "../types.ts";

export type DeleteCategoryCommand = { readonly type: "deleteCategory"; readonly name: string };

/** Deletes a category. Only an empty one, so undo loses nothing. Low, Sonar 1. */
export function executeDeleteCategory(state: PanelState, command: DeleteCategoryCommand, stamp: Stamp): PanelState {
  if (requireCategory(state.categories, command.name).seeders.length > 0) throw new Error(`Category ${command.name} still has seeders.`);

  return withEntry(state, { ...stamp, category: command.name, op: "deleteCategory" });
}
