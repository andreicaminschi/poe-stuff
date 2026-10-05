import { single, type Params } from "../command-schema.ts";
import { requireCategory, withEntry, type Stamp } from "../panel-state.ts";
import type { PanelState } from "../types.ts";

export type DeleteCategoryCommand = { readonly type: "deleteCategory"; readonly names: readonly string[] };

export const deleteCategoryParams: Params<DeleteCategoryCommand> = { names: single("name") };

/** Deletes one category. Only an empty one, so undo loses nothing. Low, Sonar 1. */
function deleteOne(state: PanelState, name: string, stamp: Stamp): PanelState {
  if (requireCategory(state.categories, name).seeders.length > 0) throw new Error(`Category ${name} still has seeders.`);

  return withEntry(state, { ...stamp, category: name, op: "deleteCategory" });
}

/** Deletes every named category. Low, Sonar 0. */
export const executeDeleteCategory = (state: PanelState, command: DeleteCategoryCommand, stamp: Stamp): PanelState =>
  command.names.reduce((next, name) => deleteOne(next, name, stamp), state);
