import type { Command } from "@poe/panel-state/execute-command";
import type { PanelState } from "@poe/panel-state/types";
import { listItemRows, type ItemRow } from "./list-item-rows.ts";

/** Keeps the rows when every command is `updateItem`, which only edits prices, else rebuilds every row. */
export const nextItemRows = (rows: readonly ItemRow[], state: PanelState, commands: readonly Command[]): readonly ItemRow[] =>
  (commands.every((command) => command.type === "updateItem")
    ? rows
    : listItemRows(state));
