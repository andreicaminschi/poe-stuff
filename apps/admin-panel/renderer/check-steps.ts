import { executeCommand, type StateCommand } from "../commands.ts";
import type { PanelState } from "../types.ts";

const STAMP = { id: "preview", at: "1970-01-01T00:00:00.000Z", actor: "preview" };

export type CheckedSteps = { readonly steps: readonly StateCommand[]; readonly errors: readonly (string | undefined)[] };

/** Parses one step's JSON into a command, or says why it cannot. Low, Sonar 2. */
function parseStep(text: string): StateCommand | string {
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return "Not a JSON object.";
    if (typeof (parsed as { type?: unknown }).type !== "string") return "Missing \"type\".";
    return parsed as StateCommand;
  } catch (error) {
    return error instanceof Error
      ? error.message
      : "Not valid JSON.";
  }
}

/**
 * Parses every step and runs them in order on a copy of the state, so the plan modal can
 * show which step would fail before anything is dispatched. Low, Sonar 2.
 */
export function checkSteps(start: PanelState, texts: readonly string[]): CheckedSteps {
  let state = start;
  const steps: StateCommand[] = [];
  const errors: (string | undefined)[] = [];

  for (const text of texts) {
    const step = parseStep(text);
    if (typeof step === "string") {
      errors.push(step);
      continue;
    }
    try {
      state = executeCommand(state, step, STAMP);
      steps.push(step);
      errors.push(undefined);
    } catch (error) {
      errors.push(error instanceof Error
        ? error.message
        : String(error));
    }
  }
  return { steps, errors };
}
