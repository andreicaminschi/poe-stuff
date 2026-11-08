import { executeCreateCategory, type CreateCategoryCommand } from "./execute-command/create-category.ts";
import { executeCreateSeeder, type CreateSeederCommand } from "./execute-command/create-seeder.ts";
import { executeDeleteCategory, type DeleteCategoryCommand } from "./execute-command/delete-category.ts";
import { executeDeleteSeeders, type DeleteSeedersCommand } from "./execute-command/delete-seeders.ts";
import { executeMoveSeeders, type MoveSeedersCommand } from "./execute-command/move-seeders.ts";
import { executeRename, type RenameCommand } from "./execute-command/rename.ts";
import { executeUpdateItem, type UpdateItemCommand } from "./execute-command/update-item.ts";
import { executeUpdateSeeders, type UpdateSeedersCommand } from "./execute-command/update-seeders.ts";
import { generateItems, listClashes } from "./generate-items.ts";
import type { PanelState, SplitSettings } from "./types.ts";

export type {
  CreateCategoryCommand,
  CreateSeederCommand,
  DeleteCategoryCommand,
  DeleteSeedersCommand,
  MoveSeedersCommand,
  RenameCommand,
  UpdateItemCommand,
  UpdateSeedersCommand,
};

/** The commands that edit seeders and categories. They never touch item data directly. */
type SeederCommand =
  | CreateCategoryCommand
  | RenameCommand
  | DeleteCategoryCommand
  | CreateSeederCommand
  | UpdateSeedersCommand
  | MoveSeedersCommand
  | DeleteSeedersCommand;

export type Command = SeederCommand | UpdateItemCommand;

type Executors = {
  readonly [K in SeederCommand["type"]]: (state: PanelState, command: Extract<SeederCommand, { readonly type: K }>) => PanelState;
};

const EXECUTORS: Executors = {
  createCategory: executeCreateCategory,
  rename: executeRename,
  deleteCategory: executeDeleteCategory,
  createSeeder: executeCreateSeeder,
  updateSeeders: executeUpdateSeeders,
  moveSeeders: executeMoveSeeders,
  deleteSeeders: executeDeleteSeeders,
};

/** Every command type, in a fixed order. */
export const COMMAND_TYPES = [...Object.keys(EXECUTORS), "updateItem"] as readonly Command["type"][];

/** Returns the state with item data kept only for generated items. Throws when two categories output one item. */
function settleItems(state: PanelState, splitDefaults: SplitSettings): PanelState {
  const items = generateItems(state, splitDefaults);
  const clash = listClashes(items)[0];

  if (clash !== undefined) throw new Error(`${clash.categories.join(" and ")} would both output "${clash.key}".`);
  const keys = new Set(items.map((item) => item.key));
  return { ...state, items: Object.fromEntries(Object.entries(state.items).filter(([key]) => keys.has(key))) };
}

/**
 * Returns the state after one command. Pure: the input state is never changed. Throws when the
 * command names something missing, or leaves two categories outputting the same item. Item data
 * of items no longer generated is dropped.
 */
export function executeCommand(state: PanelState, command: Command, splitDefaults: SplitSettings): PanelState {
  if (command.type === "updateItem") {
    const keys = new Set(generateItems(state, splitDefaults).map((item) => item.key));
    return executeUpdateItem(state, command, keys);
  }
  const execute = EXECUTORS[command.type] as (state: PanelState, command: SeederCommand) => PanelState;

  return settleItems(execute(state, command), splitDefaults);
}
