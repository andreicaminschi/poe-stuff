import { executeCommand, type Command } from "@poe/panel-state/execute-command";
import type { PanelState } from "@poe/panel-state/types";
import { applyPatch, diffState, invertPatch, isEmptyPatch, type Patch } from "./session/patch.ts";

export type Actor = "user" | "agent";

/** Who ran something, and when. */
export type Stamp = { readonly id: string; readonly at: string; readonly actor: Actor };

export type UndoCommand = { readonly type: "undo"; readonly entry: string };

/** One log line: the command as it was asked for, and the patch it made. */
export type Entry = Stamp & { readonly command: Command | UndoCommand; readonly patch: Patch };

/** One open version: its state, what is on disk, and what is not saved yet. */
export type Session = {
  readonly version: string;
  readonly published: boolean;
  readonly state: PanelState;
  readonly saved: readonly Entry[];
  readonly pending: readonly Entry[];
};

/** Opens a version with nothing pending. */
export const openSession = (version: string, published: boolean, state: PanelState, saved: readonly Entry[]): Session =>
  ({ version, published, state, saved, pending: [] });

/**
 * Runs one command and logs it. Throws when the executor refuses it, or when it changes nothing,
 * so a no-op never fills the log.
 */
export function runCommand(session: Session, command: Command, stamp: Stamp): Session {
  const after = executeCommand(session.state, command);
  const patch = diffState(session.state, after);

  if (isEmptyPatch(patch)) throw new Error(`${command.type} changed nothing.`);
  return { ...session, state: after, pending: [...session.pending, { ...stamp, command, patch }] };
}

/** Finds the newest entry no later undo has reversed, skipping undos themselves. */
export function findUndoable(entries: readonly Entry[]): Entry | undefined {
  const undone = new Set<string>();

  for (const entry of entries.toReversed()) {
    if (entry.command.type === "undo") undone.add(entry.command.entry);
    else if (!undone.has(entry.id)) return entry;
  }
  return undefined;
}

/** Undoes the newest undoable entry by appending its inverse. Throws when there is nothing to undo. */
export function undoLast(session: Session, stamp: Stamp): Session {
  const target = findUndoable([...session.saved, ...session.pending]);

  if (target === undefined) throw new Error("Nothing to undo.");
  const patch = invertPatch(target.patch);
  const entry: Entry = { ...stamp, command: { type: "undo", entry: target.id }, patch };
  return { ...session, state: applyPatch(session.state, patch), pending: [...session.pending, entry] };
}

/** Runs every command or none: throws naming the first step that fails, and the session is unchanged. */
export function runAll(session: Session, commands: readonly Command[], stamp: (at: number) => Stamp): Session {
  return commands.reduce((current, command, at) => {
    try {
      return runCommand(current, command, stamp(at));
    } catch (error) {
      throw new Error(`Step ${String(at + 1)} (${command.type}): ${error instanceof Error
        ? error.message
        : String(error)}`, { cause: error });
    }
  }, session);
}
