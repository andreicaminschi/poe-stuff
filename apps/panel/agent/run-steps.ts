import { describeContext } from "@poe/agent-input/describe-context";
import { formatFillerInput, formatInput, formatJudgeInput } from "@poe/agent-input/format-input";
import { AGENT_COMMAND_TYPES, executeCommand, type AgentCommand, type Command } from "@poe/panel-state/execute-command";
import { SUMMARY_CONFIG, toSummaryTree } from "@poe/panel-state/summary-config";
import type { PanelState } from "@poe/panel-state/types";
import { summarizeDiff } from "@util/diff-summary/summarize-diff";
import type { PlanOutcome, PlanStep } from "../contract.ts";
import { COMMAND_SCHEMA } from "../contract/command-schema.ts";
import { SPLIT_DEFAULTS } from "@poe/panel-state/split-defaults";

/** Steps one request may take before the plan stops. */
export const MAX_STEPS = 8;

export type Models = {
  readonly route: (input: string) => Promise<string>;
  readonly fill: (input: string, type: AgentCommand["type"]) => Promise<string>;
  readonly judge: (input: string) => Promise<string>;
};

export type StepTrace = { readonly model: "router" | "filler" | "judge"; readonly input: string; readonly output: string; readonly ms: number };

export type StepsResult = {
  readonly steps: readonly PlanStep[];
  readonly outcome: PlanOutcome;
  readonly detail: string | undefined;
  readonly trace: readonly StepTrace[];
};

const isCommandType = (label: string): label is AgentCommand["type"] => (AGENT_COMMAND_TYPES as readonly string[]).includes(label);

const readMessage = (error: unknown): string => (error instanceof Error
  ? error.message
  : String(error));

/** Parses the Filler's answer into a command, or explains why it is not one. */
function parseCommand(type: AgentCommand["type"], answer: string): { readonly command: Command } | { readonly error: string } {
  let params: unknown;
  try {
    params = JSON.parse(answer);
  } catch {
    return { error: `Filler answered invalid JSON: ${answer}` };
  }
  const parsed = COMMAND_SCHEMA.safeParse({ ...(params as object), type });
  return parsed.success
    ? { command: parsed.data as Command }
    : { error: `Filler answered params ${type} refuses: ${parsed.error.issues.map((issue) => issue.message).join("; ")}` };
}

/**
 * Runs the Router, Filler and Judge in a loop on a copy of the state. The Router picks the next
 * command, the Filler writes its params, the executor runs it, and the Judge reads the summary:
 * `accept` goes on, `complete` ends, `reject` stops with that step kept so the reviewer sees it.
 */
export async function runSteps(models: Models, start: PanelState, request: string): Promise<StepsResult> {
  const steps: PlanStep[] = [];
  const trace: StepTrace[] = [];
  const done: string[] = [];
  let current = start;

  const call = async (model: StepTrace["model"], input: string, run: () => Promise<string>): Promise<string> => {
    const started = performance.now();
    const output = await run();
    trace.push({ model, input, output, ms: Math.round(performance.now() - started) });
    return output;
  };
  const finish = (outcome: PlanOutcome, detail?: string): StepsResult => ({ steps, outcome, detail, trace });

  while (steps.length < MAX_STEPS) {
    const started = performance.now();
    const input = formatInput(request, describeContext(request, current), done);
    const label = await call("router", input, () => models.route(input));

    if (label === "already-done" || label === "rephrase") return finish(steps.length === 0
      ? label
      : "complete");
    if (!isCommandType(label)) return finish("invalid-params", `Router answered an unknown label: ${label}`);

    const fillerInput = formatFillerInput(input, label);
    const parsed = parseCommand(label, await call("filler", fillerInput, () => models.fill(fillerInput, label)));
    if ("error" in parsed) return finish("invalid-params", parsed.error);

    let after: PanelState;
    try {
      after = executeCommand(current, parsed.command, SPLIT_DEFAULTS);
    } catch (error) {
      return finish("command-failed", `${label}: ${readMessage(error)}`);
    }

    const summary = summarizeDiff({ start: toSummaryTree(start), before: toSummaryTree(current), after: toSummaryTree(after) }, SUMMARY_CONFIG);
    const judgeInput = formatJudgeInput(request, done, summary);
    const verdict = await call("judge", judgeInput, () => models.judge(judgeInput));
    const step = { command: parsed.command, summary, ms: Math.round(performance.now() - started) };

    if (verdict === "reject") {
      steps.push({ ...step, verdict });
      return finish("rejected", "The Judge rejected the last step.");
    }
    if (verdict !== "accept" && verdict !== "complete") return finish("invalid-params", `Judge answered an unknown label: ${verdict}`);
    steps.push({ ...step, verdict });
    if (verdict === "complete") return finish("complete");
    done.push(...summary);
    current = after;
  }
  return finish("step-limit", `Stopped after ${String(MAX_STEPS)} steps.`);
}
