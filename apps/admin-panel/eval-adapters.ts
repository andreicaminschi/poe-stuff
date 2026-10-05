import { performance } from "node:perf_hooks";
import { canonicalJson } from "./canonical-json.ts";
import type { StateCommand, ToolType } from "./commands.ts";
import { percentiles } from "./benchmark-agent.ts";
import type { EntryRow, IntentRow } from "./generate-training/classify-request.ts";
import type { ChooseRow, FillRow, RequestInput, RowMeta, StopRow } from "./generate-training/play-example.ts";
import { listTools } from "./list-tools.ts";
import { startProgress } from "./progress-line.ts";
import type { AgentModels } from "./run-agent.ts";
import { readHead, topLabel } from "./run-agent/load-encoder.ts";
import { pickCommand } from "./run-agent/pick-command.ts";
import { describeRequest, writeFillUser } from "./run-agent/prompts.ts";

type Labelled = { readonly input: RequestInput; readonly meta: RowMeta };

type Scored = { readonly goal: string; readonly form: string; readonly hit: boolean; readonly ms: number; readonly miss?: { readonly query: string; readonly expected: unknown; readonly actual: unknown } };

/** Keeps the first `perPair` rows of each goal and form. Low, Sonar 1. */
export function samplePerPair<T extends { readonly meta: RowMeta }>(rows: readonly T[], perPair: number): readonly T[] {
  const seen = new Map<string, number>();

  return rows.filter((row) => {
    const key = `${row.meta.goal}/${row.meta.form}`;
    const count = seen.get(key) ?? 0;
    seen.set(key, count + 1);
    return count < perPair;
  });
}

/** A hit, or a miss that keeps the query and both answers. Low, Sonar 1. */
const judge = (row: Labelled, ms: number, hit: boolean, expected: unknown, actual: unknown): Scored =>
  hit
    ? { ...row.meta, hit, ms }
    : { ...row.meta, hit, ms, miss: { query: row.input.query, expected, actual } };

/** Times one call and compares its answer with the expected one. Low, Sonar 1. */
async function score<T>(row: Labelled, expected: T, call: () => Promise<T>, same: (actual: T) => boolean = (actual) => actual === expected): Promise<Scored> {
  const started = performance.now();
  const actual = await call();
  return judge(row, performance.now() - started, same(actual), expected, actual);
}

/** Parses an answer and compares it with the expected args, key order aside. Low, Sonar 1. */
function isSameArgs(answer: string, args: Readonly<Record<string, unknown>>): boolean {
  try {
    return canonicalJson(JSON.parse(answer)) === canonicalJson(args);
  } catch {
    return false;
  }
}

/** Accuracy overall and per goal and form, latency, and every miss. Low, Sonar 0. */
function report(scored: readonly Scored[]) {
  const keys = [...new Set(scored.map((at) => `${at.goal}/${at.form}`))].sort();

  return {
    rows: scored.length,
    accuracy: Number((scored.filter((at) => at.hit).length / Math.max(scored.length, 1)).toFixed(4)),
    byGoal: Object.fromEntries(keys.map((key) => {
      const group = scored.filter((at) => `${at.goal}/${at.form}` === key);
      return [key, `${String(group.filter((at) => at.hit).length)}/${String(group.length)}`];
    })),
    latencyMs: percentiles(scored.map((at) => at.ms)),
    misses: scored.flatMap((at) => (at.miss === undefined
      ? []
      : [{ goal: at.goal, form: at.form, ...at.miss }])),
  };
}

/** Scores rows one at a time, with a progress line. Low, Sonar 0. */
async function scoreAll<T>(label: string, rows: readonly T[], scoreOne: (row: T) => Promise<Scored>): Promise<readonly Scored[]> {
  const scored: Scored[] = [];
  const done = startProgress(label, rows.length);
  for (const row of rows) {
    scored.push(await scoreOne(row));
    done();
  }
  return scored;
}

export type EvalRows = {
  readonly stop: readonly StopRow[];
  readonly choose: readonly ChooseRow[];
  readonly fill: readonly FillRow[];
  readonly entry: readonly EntryRow[];
  readonly intent: readonly IntentRow[];
};

/**
 * Checks each adapter and the filler against their own labels, one row at a time, each fed
 * the right context. Choose is scored as the picked command, and per half.
 * Low, Sonar 1.
 */
export async function evalAdapters(label: string, models: AgentModels, rows: EvalRows) {
  const tools = listTools();
  const top = async (adapter: "stop" | "entry" | "intent", text: string) => topLabel(readHead(await models.runAdapter(adapter, [text]), adapter));

  const stop = await scoreAll(`${label} stop rows`, rows.stop, (row) => score(row, row.output.reason, () => top("stop", describeRequest(row.input))));
  const entry = await scoreAll(`${label} entry rows`, rows.entry, (row) => score(row, row.output.entry, () => top("entry", describeRequest(row.input))));
  const intent = await scoreAll(`${label} intent rows`, rows.intent, (row) => score(row, row.output.intent, () => top("intent", describeRequest(row.input))));

  const choose = await scoreAll(`${label} choose rows`, rows.choose, async (row) => {
    const started = performance.now();
    const scores = await models.runAdapter("choose", [describeRequest(row.input)]);
    const ms = performance.now() - started;
    const actual = {
      command: pickCommand(readHead(scores, "action"), readHead(scores, "target")),
      action: topLabel(readHead(scores, "action")),
      target: topLabel(readHead(scores, "target")),
    };
    return judge(row, ms, actual.command === row.meta.command, { command: row.meta.command, ...row.output }, actual);
  });

  const fill = await scoreAll(`${label} fill rows`, rows.fill, (row) => {
    const type = row.input.command as ToolType;
    return score(row, canonicalJson(row.output), async () => models.fillParams(type, writeFillUser(row.input, type, tools[type].fields)), (answer) => isSameArgs(answer, row.output));
  });

  type Parts = { readonly action: string; readonly target?: string };
  const chooseMisses = choose.flatMap((at) => (at.miss === undefined
    ? []
    : [{ expected: at.miss.expected as Parts, actual: at.miss.actual as Parts }]));

  return {
    stop: report(stop),
    choose: {
      ...report(choose),
      actionMisses: chooseMisses.filter(({ expected, actual }) => expected.action !== actual.action).length,
      targetMisses: chooseMisses.filter(({ expected, actual }) => expected.target !== undefined && expected.target !== actual.target).length,
    },
    entry: report(entry),
    intent: report(intent),
    fill: report(fill),
  };
}

export type CommandList = readonly StateCommand["type"][];
