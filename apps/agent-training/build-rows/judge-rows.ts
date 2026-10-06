import { executeCommand, type Command } from "@poe/panel-state/execute-command";
import { SUMMARY_CONFIG } from "@poe/panel-state/summary-config";
import type { PanelState } from "@poe/panel-state/types";
import { summarizeDiff } from "@util/diff-summary/summarize-diff";
import type { PlayedGoal } from "../build-goals.ts";
import { deriveSeed } from "../build-goals/derive-seed.ts";
import { pickOne } from "../build-goals/pick.ts";
import type { JudgeRow } from "../types.ts";
import { changeAction } from "./change-action.ts";
import { changeCoverage } from "./change-coverage.ts";
import { changeTarget } from "./change-target.ts";
import { changeValue } from "./change-value.ts";
import { formatJudgeInput, listDoneLines } from "./format-input.ts";

const REJECT_KINDS = ["unrelated", "wrong-target", "wrong-value", "wrong-coverage", "wrong-action"] as const;

/** Draws before a step gives up on finding a reject. */
const MAX_REJECT_ATTEMPTS = 10;

type RejectKind = (typeof REJECT_KINDS)[number];

/** Picks the first step of another goal, for a reject that is plainly unrelated to the request. */
function pickUnrelatedStep(goals: readonly PlayedGoal[], index: number, seed: number): Command | undefined {
  const others = goals.filter((goal, at) => at !== index && goal.steps.length > 0);
  return others.length === 0
    ? undefined
    : pickOne(others, "another goal", seed).steps[0];
}

/** Builds the wrong command of one reject kind. Throws when a pick finds nothing to pick from. */
function buildWrongCommand(kind: RejectKind, command: Command, before: PanelState, goals: readonly PlayedGoal[], index: number, seed: number): Command | undefined {
  if (kind === "unrelated") return pickUnrelatedStep(goals, index, seed);
  if (kind === "wrong-target") return changeTarget(command, before, seed);
  if (kind === "wrong-value") return changeValue(command, before, seed);
  if (kind === "wrong-coverage") return changeCoverage(command, before, seed);
  return changeAction(command, before, seed);
}

/** Builds the wrong command, or undefined when the kind does not fit the step or has nothing to pick from. */
function tryWrongCommand(kind: RejectKind, command: Command, before: PanelState, goals: readonly PlayedGoal[], index: number, seed: number): Command | undefined {
  try {
    return buildWrongCommand(kind, command, before, goals, index, seed);
  } catch {
    return undefined;
  }
}

/** Runs a command and summarizes it, or undefined when the executor refuses it. */
function summarizeCommand(goal: PlayedGoal, before: PanelState, command: Command): readonly string[] | undefined {
  try {
    return summarizeDiff({ start: goal.start, before, after: executeCommand(before, command) }, SUMMARY_CONFIG);
  } catch {
    return undefined;
  }
}

/**
 * Draws one reject for a step: a wrong command of a random kind, run for real. A kind that does
 * not fit, a command the executor refuses, or one that reads the same as the correct step is
 * redrawn. Undefined when no attempt gives a reject.
 */
function drawReject(goal: PlayedGoal, index: number, at: number, goals: readonly PlayedGoal[]): JudgeRow | undefined {
  const command = goal.steps[at];
  const step = goal.played[at];
  if (command === undefined || step === undefined) return undefined;

  for (let attempt = 0; attempt < MAX_REJECT_ATTEMPTS; attempt += 1) {
    const seed = deriveSeed(goal.seed, `reject-${at}-${attempt}`);
    const kind = pickOne(REJECT_KINDS, "a reject kind", deriveSeed(seed, "kind"));
    const wrong = tryWrongCommand(kind, command, step.before, goals, index, seed);
    const lines = wrong === undefined
      ? undefined
      : summarizeCommand(goal, step.before, wrong);
    if (lines !== undefined && JSON.stringify(lines) !== JSON.stringify(step.lines)) {
      return { goal: index, kind: goal.kind, input: formatJudgeInput(goal.request, listDoneLines(goal, at), lines), label: "reject", mutation: kind };
    }
  }
  return undefined;
}

/** Builds the reject for an already-done goal: its step run anyway, which changes nothing. */
function buildNoOpRow(goal: PlayedGoal, index: number): readonly JudgeRow[] {
  const done = goal.setup.at(-1);
  const lines = done === undefined
    ? undefined
    : summarizeCommand(goal, goal.start, done);

  return lines === undefined
    ? []
    : [{ goal: index, kind: goal.kind, input: formatJudgeInput(goal.request, [], lines), label: "reject", mutation: "no-op" }];
}

/**
 * Cuts a goal into Judge rows. Each correct step reads `accept`, or `complete` when it is the
 * last, and gets one reject drawn from five kinds: an unrelated step, or the wrong target, value,
 * coverage or action. An already-done goal gives one reject for its step run anyway.
 */
export function buildJudgeRows(goal: PlayedGoal, index: number, goals: readonly PlayedGoal[]): readonly JudgeRow[] {
  if (goal.kind === "already-done") return buildNoOpRow(goal, index);

  return goal.played.flatMap((step, at) => {
    const correct: JudgeRow = { goal: index, kind: goal.kind, input: formatJudgeInput(goal.request, listDoneLines(goal, at), step.lines), label: at === goal.played.length - 1
      ? "complete"
      : "accept" };
    const reject = drawReject(goal, index, at, goals);
    return reject === undefined
      ? [correct]
      : [correct, reject];
  });
}
