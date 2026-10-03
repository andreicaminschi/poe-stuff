import { executeCreateCategory, type CreateCategoryCommand } from "./commands/create-category.ts";
import { executeCreateSeeder, type CreateSeederCommand } from "./commands/create-seeder.ts";
import { executeDeleteCategory, type DeleteCategoryCommand } from "./commands/delete-category.ts";
import { executeDeleteSeeder, type DeleteSeederCommand } from "./commands/delete-seeder.ts";
import { executeMoveSeeder, type MoveSeederCommand } from "./commands/move-seeder.ts";
import { executeReplaceSeeder, type ReplaceSeederCommand } from "./commands/replace-seeder.ts";
import type { SaveCommand } from "./commands/save.ts";
import { executeUndo, type UndoCommand } from "./commands/undo.ts";
import { executeUpdateSeeder, type UpdateSeederCommand } from "./commands/update-seeder.ts";
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
  undo: executeUndo,
};

/** Returns the state after one command, its edit queued as a log entry. Throws when it names something missing. Low, Sonar 0. */
export function executeCommand(state: PanelState, command: StateCommand, stamp: Stamp): PanelState {
  const execute = executors[command.type] as (state: PanelState, command: StateCommand, stamp: Stamp) => PanelState;

  return execute(state, command, stamp);
}
