import { performance } from "node:perf_hooks";
import { toCommandArgs } from "./command-schema.ts";
import { executeCommand, TOOL_PARAMS, type StateCommand, type ToolType } from "./commands.ts";
import { formatContext, formatContextJson } from "./format-context.ts";
import { CONDITION_FORMATS, expandCommand } from "./condition-values.ts";
import { REPHRASE } from "./decision-options.ts";
import { listTools } from "./list-tools.ts";
import type { Stamp } from "./panel-state.ts";
import { readHead, topLabel, type RunAdapter } from "./run-agent/load-encoder.ts";
import type { FillParams } from "./run-agent/load-fill.ts";
import { pickCommand } from "./run-agent/pick-command.ts";
import { describeRequest, writeFillUser } from "./run-agent/prompts.ts";
import type { PanelState } from "./types.ts";

const MAX_TURNS = 5;
const TOOLS = listTools();

export type AgentModels = { readonly runAdapter: RunAdapter; readonly fillParams: FillParams };

export type AgentTurn = {
  readonly stopMs: number;
  readonly chooseMs: number;
  readonly fillMs: number;
  readonly command: StateCommand["type"];
  readonly answer: string;
};

export type AgentOutcome = "done" | "already applied" | "unclear" | "refused" | "turn limit" | "invalid json" | "command failed";

export type AgentRun = {
  readonly state: PanelState;
  readonly turns: readonly AgentTurn[];
  readonly lastStopMs: number;
  readonly outcome: AgentOutcome;
  readonly commands: readonly StateCommand[];
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
    return executeCommand(state, expandCommand(command), stamp);
  } catch {
    return undefined;
  }
}

/**
 * The agentic loop: the stop adapter says whether to stop, the choose adapter picks the
 * tool, the filler fills its schema, and the command runs on the state. Stops when nothing
 * more is needed, on rephrase, on a refusal, at the turn limit, or on a command it cannot
 * run. Nothing needed before any command means already applied.
 * Medium, Sonar 5.
 */
export async function runAgent(models: AgentModels, start: PanelState, query: string, names: readonly string[], stamp: Stamp): Promise<AgentRun> {
  let state = start;
  const turns: AgentTurn[] = [];
  const commands: StateCommand[] = [];

  while (turns.length < MAX_TURNS) {
    const turn = { query, context: formatContext(state, CONDITION_FORMATS, names) };
    const text = describeRequest(turn);
    const stop = await timed(() => models.runAdapter("stop", [text]));
    if (topLabel(readHead(stop.value, "stop")) === "nothing-needed") return { state, turns, lastStopMs: stop.ms, outcome: commands.length === 0
      ? "already applied"
      : "done", commands };

    const choose = await timed(() => models.runAdapter("choose", [text]));
    const picked = pickCommand(readHead(choose.value, "action"), readHead(choose.value, "target"));
    if (picked === REPHRASE) return { state, turns, lastStopMs: stop.ms, outcome: "unclear", commands };

    const type: ToolType = picked;
    const fillRequest = { query, context: formatContextJson(state, CONDITION_FORMATS, names) };
    const fill = await timed(() => models.fillParams(type, writeFillUser(fillRequest, type, TOOLS[type].fields)));
    turns.push({ stopMs: stop.ms, chooseMs: choose.ms, fillMs: fill.ms, command: type, answer: fill.value });

    const params = readParams(fill.value);
    if (params === undefined) return { state, turns, lastStopMs: 0, outcome: "invalid json", commands };
    if ("refuse" in params) return { state, turns, lastStopMs: 0, outcome: "refused", commands };

    const command = { type, ...toCommandArgs(TOOL_PARAMS[type], params) } as StateCommand;
    const next = tryExecute(state, command, stamp);
    if (next === undefined) return { state, turns, lastStopMs: 0, outcome: "command failed", commands };

    state = next;
    commands.push(command);
  }

  return { state, turns, lastStopMs: 0, outcome: "turn limit", commands };
}
