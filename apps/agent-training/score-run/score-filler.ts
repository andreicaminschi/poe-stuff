import { executeCommand, type Command } from "@poe/panel-state/execute-command";
import diff from "microdiff";
import type { PlayedGoal } from "../build-goals.ts";

/** One Filler prediction: its row, with the JSON the model wrote. */
export type FillerPrediction = { readonly goal: number; readonly kind: string; readonly input: string; readonly output: string; readonly predicted: string };

export type FillerReport = {
  readonly count: number;
  readonly validJson: number;
  readonly exactJson: number;
  readonly executionMatch: number;
  readonly failures: readonly { readonly kind: string; readonly input: string; readonly expected: string; readonly predicted: string; readonly why: string }[];
};

type Outcome = { readonly valid: boolean; readonly exact: boolean; readonly executes: boolean; readonly why: string };

/** Reads the command type the Router chose off the last line of the Filler's input. */
const readCommandType = (input: string): string => input.slice(input.lastIndexOf("command: ") + "command: ".length).trim();

/** Parses JSON, or undefined when it does not parse. */
function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** Writes a value with sorted keys, so two equal objects print the same. */
const canonical = (value: unknown): string => JSON.stringify(value, (_, inner: unknown) => (inner !== null && typeof inner === "object" && !Array.isArray(inner)
  ? Object.fromEntries(Object.entries(inner).sort(([left], [right]) => left.localeCompare(right)))
  : inner));

/** Judges one prediction: does it parse, does it equal the gold params, and does running it give the gold step's exact state. */
function judgePrediction(row: FillerPrediction, step: PlayedGoal["played"][number] | undefined): Outcome {
  const parsed = parseJson(row.predicted);
  if (parsed === undefined || typeof parsed !== "object" || parsed === null) return { valid: false, exact: false, executes: false, why: "not JSON" };
  const exact = canonical(parsed) === canonical(JSON.parse(row.output));
  if (step === undefined) return { valid: true, exact, executes: exact, why: "no state to run against" };
  try {
    const after = executeCommand(step.before, { type: readCommandType(row.input), ...parsed } as Command);
    const executes = diff(after, step.after).length === 0;
    return { valid: true, exact, executes, why: executes
      ? ""
      : "runs, but gives a different state" };
  } catch (error) {
    return { valid: true, exact, executes: false, why: `refused: ${(error as Error).message}` };
  }
}

/**
 * Scores the Filler by execution match: each predicted command runs through the real executor on
 * the step's own state, and counts only when it gives exactly the state the correct command gave.
 * A different but equivalent spelling of the same params (a set name for its values, say) still
 * counts. Rows map to steps by order within each goal.
 */
export function scoreFiller(rows: readonly FillerPrediction[], goals: readonly PlayedGoal[]): FillerReport {
  const misaligned = rows.find((row) => !row.input.startsWith(`request: ${goals[row.goal]?.request ?? "\u0000"}\n`));
  if (misaligned !== undefined) throw new Error(`Rebuilt goals don't match the rows (goal ${misaligned.goal}): the generator changed since this set was written. Regenerate the set.`);
  const seen = new Map<number, number>();
  const outcomes = rows.map((row) => {
    const at = seen.get(row.goal) ?? 0;
    seen.set(row.goal, at + 1);
    return { row, outcome: judgePrediction(row, goals[row.goal]?.played[at]) };
  });

  return {
    count: rows.length,
    validJson: outcomes.filter(({ outcome }) => outcome.valid).length / rows.length,
    exactJson: outcomes.filter(({ outcome }) => outcome.exact).length / rows.length,
    executionMatch: outcomes.filter(({ outcome }) => outcome.executes).length / rows.length,
    failures: outcomes.filter(({ outcome }) => !outcome.executes).slice(0, 12).map(({ row, outcome }) => ({
      kind: row.kind, input: row.input, expected: row.output, predicted: row.predicted, why: outcome.why,
    })),
  };
}
