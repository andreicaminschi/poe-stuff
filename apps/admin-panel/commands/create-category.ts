import { withEntry, type Stamp } from "../panel-state.ts";
import type { PanelState } from "../types.ts";

export type CreateCategoryCommand = { readonly type: "createCategory"; readonly name: string };

/** Creates an empty category. Low, Sonar 1. */
export function executeCreateCategory(state: PanelState, command: CreateCategoryCommand, stamp: Stamp): PanelState {
  if (state.categories.some((category) => category.name === command.name)) throw new Error(`Category ${command.name} already exists.`);

  return withEntry(state, { ...stamp, category: command.name, op: "createCategory" });
}
