import { performance } from "node:perf_hooks";
import { executeCommand, type StateCommand } from "./commands.ts";
import { formatContext } from "./format-context.ts";
import { CONDITION_FORMATS } from "./generate-training/conditions.ts";
import type { Stamp } from "./panel-state.ts";
import type { FillParams } from "./run-agent/load-fill.ts";
import type { ScoreYes } from "./run-agent/load-decide.ts";
import { STOP_QUESTION, writeCommandQuestion, writeDecideText, writeFillPrompt } from "./run-agent/prompts.ts";
import type { PanelState } from "./types.ts";

const MAX_TURNS = 5;

export type AgentModels = { readonly scoreYes: ScoreYes; readonly fillParams: FillParams; readonly commands: readonly StateCommand["type"][] };

export type AgentTurn = {
  readonly stopMs: number;
  readonly chooseMs: number;
  readonly fillMs: number;
  readonly command: StateCommand["type"];
  readonly answer: string;
};

export type AgentOutcome = "done" | "turn limit" | "invalid json" | "command failed";

export type AgentRun = {
  readonly state: PanelState;
  readonly turns: readonly AgentTurn[];
  readonly lastStopMs: number;
  readonly outcome: AgentOutcome;
};

/** Times one async call. Low, Sonar 0. */
async function timed<T>(call: () => Promise<T>): Promise<{ readonly value: T; readonly ms: number }> {
  const started = performance.now();
  const value = await call();
  return { value, ms: performance.now() - started };
}

/** Parses the filler's JSON into params, or undefined. Low, Sonar 1. */
function readParams(answer: string): Readonly<Record<string, unknown>> | undefined {
  try {
    const parsed: unknown = JSON.parse(answer);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? parsed as Readonly<Record<string, unknown>>
      : undefined;
  } catch {
    return undefined;
  }
}

/** Runs a command, or returns undefined when the executor refuses it. Low, Sonar 1. */
function tryExecute(state: PanelState, command: StateCommand, stamp: Stamp): PanelState | undefined {
  try {
    return executeCommand(state, command, stamp);
  } catch {
    return undefined;
  }
}

/**
 * The agentic loop: ask "done?", pick the next command, fill its params, run it on the
 * state, repeat. Stops when the model says done, at the turn limit, or on a command it
 * cannot run. Medium, Sonar 4.
 */
export async function runAgent(models: AgentModels, start: PanelState, query: string, names: readonly string[], stamp: Stamp): Promise<AgentRun> {
  let state = start;
  const turns: AgentTurn[] = [];
  const history: string[] = [];

  while (turns.length < MAX_TURNS) {
    const turn = { query, context: formatContext(state, CONDITION_FORMATS, names), history };
    const stop = await timed(() => models.scoreYes([writeDecideText(turn, STOP_QUESTION)]));
    if ((stop.value[0] ?? 0) >= 0.5) return { state, turns, lastStopMs: stop.ms, outcome: "done" };

    const choose = await timed(() => models.scoreYes(models.commands.map((command) => writeDecideText(turn, writeCommandQuestion(command)))));
    const best = choose.value.indexOf(Math.max(...choose.value));
    const type = models.commands[best] ?? models.commands[0]!;
    const fill = await timed(() => models.fillParams(writeFillPrompt(turn, type)));
    turns.push({ stopMs: stop.ms, chooseMs: choose.ms, fillMs: fill.ms, command: type, answer: fill.value });

    const params = readParams(fill.value);
    if (params === undefined) return { state, turns, lastStopMs: 0, outcome: "invalid json" };

    const { type: _answeredType, ...args } = params;
    const command = { type, ...args } as StateCommand;
    const next = tryExecute(state, command, stamp);
    if (next === undefined) return { state, turns, lastStopMs: 0, outcome: "command failed" };

    state = next;
    history.push(JSON.stringify(command));
  }

  return { state, turns, lastStopMs: 0, outcome: "turn limit" };
}
