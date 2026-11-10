import type { PanelState } from "../types.ts";
import { resolveTagSeeder } from "./find-tag-seeder.ts";

export type DeleteTagSeederCommand = { readonly type: "deleteTagSeeder"; readonly name: string };

/** Removes one tag seeder. The name may be misspelt. */
export function executeDeleteTagSeeder(state: PanelState, command: DeleteTagSeederCommand): PanelState {
  const name = resolveTagSeeder(state, command.name);
  return { ...state, tagSeeders: Object.fromEntries(Object.entries(state.tagSeeders).filter(([key]) => key !== name)) };
}
