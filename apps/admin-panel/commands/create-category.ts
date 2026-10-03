import { withEntry, type Stamp } from "../panel-state.ts";
import type { PanelState } from "../types.ts";

export type CreateCategoryCommand = { readonly type: "createCategory"; readonly names: readonly string[] };

/** Creates one empty category. Low, Sonar 1. */
function createOne(state: PanelState, name: string, stamp: Stamp): PanelState {
  if (state.categories.some((category) => category.name === name)) throw new Error(`Category ${name} already exists.`);

  return withEntry(state, { ...stamp, category: name, op: "createCategory" });
}

/** Creates an empty category per name. Low, Sonar 0. */
export const executeCreateCategory = (state: PanelState, command: CreateCategoryCommand, stamp: Stamp): PanelState =>
  command.names.reduce((next, name) => createOne(next, name, stamp), state);
