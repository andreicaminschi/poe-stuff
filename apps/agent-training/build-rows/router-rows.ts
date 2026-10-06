import type { PlayedGoal } from "../build-goals.ts";
import type { RouterRow } from "../types.ts";
import { describeContext } from "./describe-context.ts";
import { formatInput, listDoneLines } from "./format-input.ts";

/**
 * Cuts a goal into Router rows: one per step, labelled with that step's command type. A goal
 * with no steps gives one row, `already-done` when the state satisfies it and `rephrase` otherwise.
 */
export function buildRouterRows(goal: PlayedGoal, index: number): readonly RouterRow[] {
  const source = { goal: index, kind: goal.kind };

  if (goal.steps.length === 0) {
    const label = goal.kind === "already-done"
      ? "already-done"
      : "rephrase";
    return [{ ...source, input: formatInput(goal.request, describeContext(goal.request, goal.start), []), label }];
  }
  return goal.steps.map((command, at) => ({
    ...source,
    input: formatInput(goal.request, describeContext(goal.request, goal.played[at]?.before ?? goal.start), listDoneLines(goal, at)),
    label: command.type,
  }));
}
