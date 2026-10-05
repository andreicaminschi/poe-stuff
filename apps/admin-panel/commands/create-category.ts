import { single, type Params } from "../command-schema.ts";
import { findFreeName } from "../find-free-name.ts";
import { withEntry, type Stamp } from "../panel-state.ts";
import type { PanelState } from "../types.ts";

export type CreateCategoryCommand = { readonly type: "createCategory"; readonly names: readonly string[] };

export const createCategoryParams: Params<CreateCategoryCommand> = { names: single("name") };

/** Creates one empty category. An empty name gets a free default one. Low, Sonar 2. */
function createOne(state: PanelState, requested: string, stamp: Stamp): PanelState {
  const taken = state.categories.map((category) => category.name);
  const name = requested === ""
    ? findFreeName("New category", taken)
    : requested;

  if (taken.includes(name)) throw new Error(`Category ${name} already exists.`);

  return withEntry(state, { ...stamp, category: name, op: "createCategory" });
}

/** Creates an empty category per name. Low, Sonar 0. */
export const executeCreateCategory = (state: PanelState, command: CreateCategoryCommand, stamp: Stamp): PanelState =>
  command.names.reduce((next, name) => createOne(next, name, stamp), state);
