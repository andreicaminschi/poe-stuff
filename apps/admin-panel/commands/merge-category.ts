import { required, TEXT, type Params } from "../command-schema.ts";
import type { Stamp } from "../panel-state.ts";
import type { PanelState } from "../types.ts";
import { executeDeleteCategory } from "./delete-category.ts";
import { executeMoveSeeders } from "./move-seeders.ts";

export type MergeCategoryCommand = { readonly type: "mergeCategory"; readonly category: string; readonly into: string };

export const mergeCategoryParams: Params<MergeCategoryCommand> = { category: required(TEXT), into: required(TEXT) };

/** Moves every seeder of `category` into `into`, then deletes `category`. Low, Sonar 0. */
export function executeMergeCategory(state: PanelState, command: MergeCategoryCommand, stamp: Stamp): PanelState {
  const moved = executeMoveSeeders(state, { type: "moveSeeders", targets: { category: command.category }, toCategory: command.into }, stamp);

  return executeDeleteCategory(moved, { type: "deleteCategory", names: [command.category] }, stamp);
}
