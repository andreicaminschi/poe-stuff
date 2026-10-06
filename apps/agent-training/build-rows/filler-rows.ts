import type { PlayedGoal } from "../build-goals.ts";
import type { FillerRow } from "../types.ts";
import { describeContext } from "./describe-context.ts";
import { formatInput, listDoneLines } from "./format-input.ts";

/**
 * Cuts a goal into Filler rows: one per step. The input adds the command type the Router chose,
 * and the answer is that command's params as compact JSON, without its `type`.
 */
export const buildFillerRows = (goal: PlayedGoal, index: number): readonly FillerRow[] =>
  goal.steps.map((command, at) => ({
    goal: index,
    kind: goal.kind,
    input: `${formatInput(goal.request, describeContext(goal.request, goal.played[at]?.before ?? goal.start), listDoneLines(goal, at))}\ncommand: ${command.type}`,
    output: JSON.stringify(Object.fromEntries(Object.entries(command).filter(([key]) => key !== "type"))),
  }));
