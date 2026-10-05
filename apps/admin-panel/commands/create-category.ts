import { single, type Params } from "../command-schema.ts";
import { withEntry, type Stamp } from "../panel-state.ts";
import type { PanelState } from "../types.ts";

export type CreateCategoryCommand = { readonly type: "createCategory"; readonly names: readonly string[] };

export const createCategoryParams: Params<CreateCategoryCommand> = { names: single("name") };

/** Creates one empty category. The name is mandatory. Low, Sonar 2. */
function createOne(state: PanelState, name: string, stamp: Stamp): PanelState {
  if (name.trim() === "") throw new Error("A category needs a name.");
  if (state.categories.some((category) => category.name === name)) throw new Error(`Category ${name} already exists.`);

  return withEntry(state, { ...stamp, category: name, op: "createCategory" });
}

/** Creates an empty category per name. Low, Sonar 0. */
export const executeCreateCategory = (state: PanelState, command: CreateCategoryCommand, stamp: Stamp): PanelState =>
  command.names.reduce((next, name) => createOne(next, name, stamp), state);
