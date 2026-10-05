import { performance } from "node:perf_hooks";
import { toCommandArgs } from "./command-schema.ts";
import { executeCommand, TOOL_PARAMS, type StateCommand } from "./commands.ts";
import { describeNames, formatContext, formatContextJson } from "./format-context.ts";
import { CONDITION_FORMATS, expandCommand } from "./condition-values.ts";
import { REPHRASE } from "./decision-options.ts";
import { listTools } from "./list-tools.ts";
import type { Stamp } from "./panel-state.ts";
import { readHead, topLabel, type RunAdapter } from "./run-agent/load-encoder.ts";
import type { FillParams } from "./run-agent/load-fill.ts";
import { buildAttemptSchema } from "./run-agent/allowed-values.ts";
import { rankCommands } from "./run-agent/pick-command.ts";
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

/** Asks the stop adapter whether `state` already meets the request. Low, Sonar 0. */
async function askStop(models: AgentModels, state: PanelState, query: string, names: readonly string[]): Promise<{ readonly done: boolean; readonly ms: number }> {
  const stop = await timed(() => models.runAdapter("stop", [describeRequest({ query, context: formatContext(state, CONDITION_FORMATS, query, names) })]));
  return { done: topLabel(readHead(stop.value, "stop")) === "nothing-needed", ms: stop.ms };
}

/**
 * Generate-and-verify. Stop checks the original panel first: nothing needed means already
 * applied. Choose ranks every real command once. Each attempt fills the current command with
 * its key field limited to untried names, runs on a fresh copy of the original panel, and stop
 * judges the result. A rejected attempt is retried with the next untried name, then the
 * next-best command, up to `MAX_TURNS` attempts. The plan is the one accepted command.
 * Medium, Sonar 6.
 */
export async function runAgent(models: AgentModels, start: PanelState, query: string, names: readonly string[], stamp: Stamp): Promise<AgentRun> {
  const first = await askStop(models, start, query, names);
  if (first.done) return { state: start, turns: [], lastStopMs: first.ms, outcome: "already applied", commands: [] };

  const choose = await timed(() => models.runAdapter("choose", [describeRequest({ query, context: formatContext(start, CONDITION_FORMATS, query, names) })]));
  const ranked = rankCommands(readHead(choose.value, "action"), readHead(choose.value, "target"));
  if (ranked === REPHRASE) return { state: start, turns: [], lastStopMs: first.ms, outcome: "unclear", commands: [] };

  const entries = describeNames(start, CONDITION_FORMATS, query, names);
  const fillRequest = { query, context: formatContextJson(start, CONDITION_FORMATS, query, names) };
  const turns: AgentTurn[] = [];
  let failure: AgentOutcome = "turn limit";

  for (const type of ranked) {
    const tried: Readonly<Record<string, unknown>>[] = [];
    while (turns.length < MAX_TURNS) {
      const schema = buildAttemptSchema(type, entries, tried);
      if (schema === undefined) break;

      const fill = await timed(() => models.fillParams(type, writeFillUser(fillRequest, type, TOOLS[type].fields), schema));
      const params = readParams(fill.value);
      if (params === undefined || "refuse" in params) {
        turns.push({ stopMs: 0, chooseMs: choose.ms, fillMs: fill.ms, command: type, answer: fill.value });
        if (params !== undefined && turns.length === 1) return { state: start, turns, lastStopMs: 0, outcome: "refused", commands: [] };
        failure = params === undefined ? "invalid json" : failure;
        break;
      }

      const args = toCommandArgs(TOOL_PARAMS[type], params);
      const command = { type, ...args } as StateCommand;
      const after = tryExecute(start, command, stamp);
      const verdict = after === undefined
        ? undefined
        : await askStop(models, after, query, names);
      turns.push({ stopMs: verdict?.ms ?? 0, chooseMs: choose.ms, fillMs: fill.ms, command: type, answer: fill.value });
      if (after !== undefined && verdict?.done === true) return { state: after, turns, lastStopMs: verdict.ms, outcome: "done", commands: [command] };

      failure = after === undefined ? "command failed" : "turn limit";
      tried.push(args);
    }
    if (turns.length >= MAX_TURNS) break;
  }

  return { state: start, turns, lastStopMs: 0, outcome: failure, commands: [] };
}
