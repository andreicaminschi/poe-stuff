import type { Command } from "@poe/panel-state/execute-command";
import type { PanelState } from "@poe/panel-state/types";
import { listItemRows, type ItemRow } from "./list-item-rows.ts";

/** Lists the items the commands touch, or undefined when any command is not `updateItem`. */
function listUpdatedItems(commands: readonly Command[]): ReadonlySet<string> | undefined {
  const keys = new Set<string>();

  for (const command of commands) {
    if (command.type !== "updateItem") return undefined;
    keys.add(command.item);
  }
  return keys;
}

/** Re-reads the touched rows' item tags when every command is `updateItem`, else rebuilds every row. */
export function nextItemRows(rows: readonly ItemRow[], state: PanelState, commands: readonly Command[]): readonly ItemRow[] {
  const updated = listUpdatedItems(commands);

  if (updated === undefined) return listItemRows(state);
  return rows.map((row) => (updated.has(row.key)
    ? { ...row, itemTags: Object.keys(state.items[row.key]?.tags ?? {}) }
    : row));
}
