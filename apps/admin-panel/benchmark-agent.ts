import { execFile } from "node:child_process";
import { performance } from "node:perf_hooks";
import { promisify } from "node:util";
import type { StateCommand } from "./commands.ts";
import { isSamePanel } from "./benchmark-agent/same-panel.ts";
import type { RequestRow } from "./generate-training/rows/play-example.ts";
import { runAgent, type AgentModels, type AgentRun } from "./run-agent.ts";

const STAMP = { id: "benchmark", at: "1970-01-01T00:00:00.000Z", actor: "benchmark" };

export type RequestResult = { readonly goal: string; readonly form: string; readonly query: string; readonly pass: boolean; readonly verdict: string; readonly run: AgentRun; readonly ms: number };

/** Names why a request passed or failed. Low, Sonar 4. */
function judge(request: RequestRow, run: AgentRun, same: boolean): string {
  if (request.unclear === true) return run.outcome === "unclear" || run.outcome === "refused"
    ? "pass"
    : "acted on an unclear request";
  if (run.outcome === "unclear") return "asked to rephrase a clear request";
  if (run.outcome !== "done" && run.outcome !== "already applied") return run.outcome;
  if (same) return "pass";
  if (run.turns.length === 0 && request.turns > 0) return "stopped before acting";
  if (run.turns.length !== request.turns) return "wrong turn count";
  return "wrong final state";
}

/** Runs one request through the loop and scores its final state. Low, Sonar 0. */
export async function benchmarkRequest(models: AgentModels, request: RequestRow): Promise<RequestResult> {
  const started = performance.now();
  const start = { version: "benchmark", state: "draft" as const, categories: request.start.categories, itemData: request.start.itemData, log: [], pending: [] };
  const run = await runAgent(models, start, request.query, request.names, STAMP);
  const ms = performance.now() - started;
  const same = run.outcome === "done" && isSamePanel(run.state, request.expected);
  const verdict = judge(request, run, same);

  return { goal: request.goal, form: request.form, query: request.query, pass: verdict === "pass", verdict, run, ms };
}

/** Picks `limit` requests spread evenly over the list. Low, Sonar 1. */
export const spreadSample = <T>(entries: readonly T[], limit: number): readonly T[] =>
  limit >= entries.length
    ? entries
    : entries.filter((_entry, at) => at % Math.ceil(entries.length / limit) === 0);

/** Reads the p50, p95 and max of a list of times. Low, Sonar 1. */
export function percentiles(values: readonly number[]): Readonly<Record<string, number>> {
  const sorted = [...values].sort((left, right) => left - right);
  const at = (share: number): number => Math.round(sorted[Math.min(sorted.length - 1, Math.floor(share * sorted.length))] ?? 0);

  return { p50: at(0.5), p95: at(0.95), max: Math.round(sorted.at(-1) ?? 0), count: sorted.length };
}

/** Counts results per key. Low, Sonar 0. */
function countBy(results: readonly RequestResult[], key: (result: RequestResult) => string): Readonly<Record<string, number>> {
  return Object.fromEntries([...new Set(results.map(key))].sort().map((value) => [value, results.filter((result) => key(result) === value).length]));
}

/** Pass rate per goal and form. Low, Sonar 0. */
function passByGoal(results: readonly RequestResult[]): Readonly<Record<string, number>> {
  const keys = [...new Set(results.map((result) => `${result.goal}/${result.form}`))].sort();

  return Object.fromEntries(keys.map((key) => {
    const group = results.filter((result) => `${result.goal}/${result.form}` === key);
    return [key, Number((group.filter((result) => result.pass).length / group.length).toFixed(4))];
  }));
}

/** Reads the GPU memory in use, in MB, or undefined without nvidia-smi. Low, Sonar 1. */
export async function readGpuMemory(): Promise<number | undefined> {
  try {
    const { stdout } = await promisify(execFile)("nvidia-smi", ["--query-gpu=memory.used", "--format=csv,noheader,nounits"]);
    return Number(stdout.trim().split("\n")[0]);
  } catch {
    return undefined;
  }
}

/** Sums every result into the report one benchmark run writes. Low, Sonar 0. */
export const summarize = (results: readonly RequestResult[]) => ({
  requests: results.length,
  passRate: Number((results.filter((result) => result.pass).length / Math.max(results.length, 1)).toFixed(4)),
  verdicts: countBy(results, (result) => result.verdict),
  passByGoal: passByGoal(results),
  attemptsPerRequest: percentiles(results.map((result) => result.run.turns.length)),
  passedOnRetry: results.filter((result) => result.pass && result.run.turns.length > 1).length,
  latencyMs: {
    stopDecision: percentiles(results.flatMap((result) => [...result.run.turns.map((turn) => turn.stopMs), ...(result.run.lastStopMs > 0
      ? [result.run.lastStopMs]
      : [])])),
    chooseDecision: percentiles(results.flatMap((result) => result.run.turns.map((turn) => turn.chooseMs))),
    fill: percentiles(results.flatMap((result) => result.run.turns.map((turn) => turn.fillMs))),
    request: percentiles(results.map((result) => result.ms)),
  },
});
