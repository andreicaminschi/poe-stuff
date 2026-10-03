import { performance } from "node:perf_hooks";
import { canonicalJson } from "./canonical-json.ts";
import type { StateCommand } from "./commands.ts";
import { percentiles } from "./benchmark-agent.ts";
import type { ChooseRow, FillRow, StopRow } from "./generate-training/play-example.ts";
import type { AgentModels } from "./run-agent.ts";
import { STOP_QUESTION, writeCommandQuestion, writeDecideText, writeFillPrompt } from "./run-agent/prompts.ts";

type Scored = { readonly goal: string; readonly form: string; readonly hit: boolean; readonly ms: number };

/** Keeps the first `perPair` rows of each goal and form. Low, Sonar 1. */
export function samplePerPair<T extends { readonly goal: string; readonly form: string }>(rows: readonly T[], perPair: number): readonly T[] {
  const seen = new Map<string, number>();

  return rows.filter((row) => {
    const key = `${row.goal}/${row.form}`;
    const count = seen.get(key) ?? 0;
    seen.set(key, count + 1);
    return count < perPair;
  });
}

/** Times one call and scores it. Low, Sonar 0. */
async function score<T>(row: { readonly goal: string; readonly form: string }, call: () => Promise<T>, check: (value: T) => boolean): Promise<Scored> {
  const started = performance.now();
  const value = await call();
  return { goal: row.goal, form: row.form, hit: check(value), ms: performance.now() - started };
}

/** Parses an answer and compares it with the expected args, key order aside. Low, Sonar 1. */
function isSameArgs(answer: string, args: Readonly<Record<string, unknown>>): boolean {
  try {
    return canonicalJson(JSON.parse(answer)) === canonicalJson(args);
  } catch {
    return false;
  }
}

/** Accuracy overall and per goal and form, plus latency. Low, Sonar 0. */
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
  };
}

/**
 * Checks each model against its own labels, one row at a time, each fed the right context
 * and history: the decision model on "done?" and on the next command, the filler on its args.
 * Low, Sonar 0.
 */
export async function evalAdapters(models: AgentModels, stop: readonly StopRow[], choose: readonly ChooseRow[], fill: readonly FillRow[]) {
  const stopScored: Scored[] = [];
  for (const row of stop) stopScored.push(await score(row, () => models.scoreYes([writeDecideText(row, STOP_QUESTION)]), ([yes = 0]) => (yes >= 0.5) === row.done));

  const chooseScored: Scored[] = [];
  for (const row of choose) {
    chooseScored.push(await score(row, () => models.scoreYes(models.commands.map((command) => writeDecideText(row, writeCommandQuestion(command)))), (scores) =>
      models.commands[scores.indexOf(Math.max(...scores))] === row.command));
  }

  const fillScored: Scored[] = [];
  for (const row of fill) fillScored.push(await score(row, () => models.fillParams(writeFillPrompt(row, row.command)), (answer) => isSameArgs(answer, row.args)));

  return { stop: report(stopScored), choose: report(chooseScored), fill: report(fillScored) };
}

export type CommandList = readonly StateCommand["type"][];
