import { executeCreateCategory, type CreateCategoryCommand } from "./execute-command/create-category.ts";
import { executeCreateSeeder, type CreateSeederCommand } from "./execute-command/create-seeder.ts";
import { executeDeleteCategory, type DeleteCategoryCommand } from "./execute-command/delete-category.ts";
import { executeDeleteSeeders, type DeleteSeedersCommand } from "./execute-command/delete-seeders.ts";
import { executeMergeCategory, type MergeCategoryCommand } from "./execute-command/merge-category.ts";
import { executeMoveSeeders, type MoveSeedersCommand } from "./execute-command/move-seeders.ts";
import { executeRename, type RenameCommand } from "./execute-command/rename.ts";
import { executeUpdateItems, type UpdateItemsCommand } from "./execute-command/update-items.ts";
import { executeUpdateSeeders, type UpdateSeedersCommand } from "./execute-command/update-seeders.ts";
import type { PanelState } from "./types.ts";

export type {
  CreateCategoryCommand,
  CreateSeederCommand,
  DeleteCategoryCommand,
  DeleteSeedersCommand,
  MergeCategoryCommand,
  MoveSeedersCommand,
  RenameCommand,
  UpdateItemsCommand,
  UpdateSeedersCommand,
};

export type Command =
  | CreateCategoryCommand
  | RenameCommand
  | DeleteCategoryCommand
  | MergeCategoryCommand
  | CreateSeederCommand
  | UpdateSeedersCommand
  | MoveSeedersCommand
  | DeleteSeedersCommand
  | UpdateItemsCommand;

type Executors = {
  readonly [K in Command["type"]]: (state: PanelState, command: Extract<Command, { readonly type: K }>) => PanelState;
};

const EXECUTORS: Executors = {
  createCategory: executeCreateCategory,
  rename: executeRename,
  deleteCategory: executeDeleteCategory,
  mergeCategory: executeMergeCategory,
  createSeeder: executeCreateSeeder,
  updateSeeders: executeUpdateSeeders,
  moveSeeders: executeMoveSeeders,
  deleteSeeders: executeDeleteSeeders,
  updateItems: executeUpdateItems,
};

/** Every command type, in a fixed order: the Router's command labels. */
export const COMMAND_TYPES = Object.keys(EXECUTORS) as readonly Command["type"][];

/** Returns the state after one command. Pure: the input state is never changed. Throws when the command names something missing. */
export function executeCommand(state: PanelState, command: Command): PanelState {
  const execute = EXECUTORS[command.type] as (state: PanelState, command: Command) => PanelState;

  return execute(state, command);
}
