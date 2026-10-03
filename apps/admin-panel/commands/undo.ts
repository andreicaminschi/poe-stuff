import { findUndoable, invertEntry } from "../apply-entry.ts";
import { withEntry, type Stamp } from "../panel-state.ts";
import type { PanelState } from "../types.ts";

export type UndoCommand = { readonly type: "undo" };

/** Reverts the newest edit not yet undone. Low, Sonar 1. */
export function executeUndo(state: PanelState, _command: UndoCommand, stamp: Stamp): PanelState {
  const target = findUndoable([...state.log, ...state.pending]);

  if (target === undefined) return state;

  return withEntry(state, { ...invertEntry(target, stamp.id, stamp.at), actor: stamp.actor });
}
