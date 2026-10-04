import type { Params } from "./command-schema.ts";
import { createCategoryParams, executeCreateCategory, type CreateCategoryCommand } from "./commands/create-category.ts";
import { createSeederParams, executeCreateSeeder, type CreateSeederCommand } from "./commands/create-seeder.ts";
import { deleteCategoryParams, executeDeleteCategory, type DeleteCategoryCommand } from "./commands/delete-category.ts";
import { deleteSeederParams, executeDeleteSeeder, type DeleteSeederCommand } from "./commands/delete-seeder.ts";
import { deleteSeedersParams, executeDeleteSeeders, type DeleteSeedersCommand } from "./commands/delete-seeders.ts";
import { executeMergeCategory, mergeCategoryParams, type MergeCategoryCommand } from "./commands/merge-category.ts";
import { executeMoveSeeder, moveSeederParams, type MoveSeederCommand } from "./commands/move-seeder.ts";
import { executeMoveSeeders, moveSeedersParams, type MoveSeedersCommand } from "./commands/move-seeders.ts";
import { executeReplaceSeeder, type ReplaceSeederCommand } from "./commands/replace-seeder.ts";
import type { SaveCommand } from "./commands/save.ts";
import { executeUndo, type UndoCommand } from "./commands/undo.ts";
import { executeUpdateSeeder, updateSeederParams, type UpdateSeederCommand } from "./commands/update-seeder.ts";
import { executeUpdateItems, updateItemsParams, type UpdateItemsCommand } from "./commands/update-items.ts";
import { executeUpdateSeeders, updateSeedersParams, type UpdateSeedersCommand } from "./commands/update-seeders.ts";
import type { Stamp } from "./panel-state.ts";
import type { PanelState } from "./types.ts";

export type Command =
  | SaveCommand
  | CreateCategoryCommand
  | DeleteCategoryCommand
  | CreateSeederCommand
  | UpdateSeederCommand
  | ReplaceSeederCommand
  | MoveSeederCommand
  | DeleteSeederCommand
  | UpdateSeedersCommand
  | DeleteSeedersCommand
  | MoveSeedersCommand
  | MergeCategoryCommand
  | UpdateItemsCommand
  | UndoCommand;

/** Runs without disk. */
export type StateCommand = Exclude<Command, SaveCommand>;

type Executors = {
  readonly [K in StateCommand["type"]]: (state: PanelState, command: Extract<StateCommand, { readonly type: K }>, stamp: Stamp) => PanelState;
};

const executors: Executors = {
  createCategory: executeCreateCategory,
  deleteCategory: executeDeleteCategory,
  createSeeder: executeCreateSeeder,
  updateSeeder: executeUpdateSeeder,
  replaceSeeder: executeReplaceSeeder,
  moveSeeder: executeMoveSeeder,
  deleteSeeder: executeDeleteSeeder,
  updateSeeders: executeUpdateSeeders,
  deleteSeeders: executeDeleteSeeders,
  moveSeeders: executeMoveSeeders,
  mergeCategory: executeMergeCategory,
  updateItems: executeUpdateItems,
  undo: executeUndo,
};

/** The commands the agent can call. */
export type ToolType = Exclude<StateCommand["type"], "replaceSeeder" | "undo">;

type ToolParams = { readonly [K in ToolType]: Params<Extract<StateCommand, { readonly type: K }>> };

export const TOOL_PARAMS: ToolParams = {
  createCategory: createCategoryParams,
  deleteCategory: deleteCategoryParams,
  createSeeder: createSeederParams,
  updateSeeder: updateSeederParams,
  moveSeeder: moveSeederParams,
  deleteSeeder: deleteSeederParams,
  updateSeeders: updateSeedersParams,
  deleteSeeders: deleteSeedersParams,
  moveSeeders: moveSeedersParams,
  mergeCategory: mergeCategoryParams,
  updateItems: updateItemsParams,
};

/** Returns the state after one command, its edit queued as a log entry. Throws when it names something missing. Low, Sonar 0. */
export function executeCommand(state: PanelState, command: StateCommand, stamp: Stamp): PanelState {
  const execute = executors[command.type] as (state: PanelState, command: StateCommand, stamp: Stamp) => PanelState;

  return execute(state, command, stamp);
}
