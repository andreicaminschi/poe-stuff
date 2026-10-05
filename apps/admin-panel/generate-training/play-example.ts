import { COMMAND_PARTS, type Action, type Target } from "../command-parts.ts";
import { toToolArgs } from "../command-schema.ts";
import { executeCommand, TOOL_PARAMS, type StateCommand, type ToolType } from "../commands.ts";
import { formatContext, formatContextJson } from "../format-context.ts";
import type { PanelState } from "../types.ts";
import { CONDITION_FORMATS, expandCommand } from "../condition-values.ts";
import { REPHRASE, type DecisionOption } from "../decision-options.ts";
import type { Example } from "./example.ts";

const STAMP = { id: "generated", at: "1970-01-01T00:00:00.000Z", actor: "generator" };

/** Which generator template made a row. Never model input. */
export type RowMeta = { readonly goal: string; readonly form: string };

/** What every model reads: the request and the context lines for its names. */
export type RequestInput = { readonly query: string; readonly context: string };

/** One training row: what the model reads, what it must answer, and bookkeeping. */
export type Row<Input, Output, Meta = RowMeta> = { readonly input: Input; readonly output: Output; readonly meta: Meta };

/** Whether the request still needs a command. Code reads `nothing-needed` as applied or already applied. */
export type StopReason = "nothing-needed" | "work-needed";

export type StopRow = Row<RequestInput, { readonly reason: StopReason }>;
/** Rephrase has no target. The full command is kept for the eval only. */
export type ChooseRow = Row<RequestInput, { readonly action: Action; readonly target?: Target }, RowMeta & { readonly command: DecisionOption }>;
/** The output is the filler's whole answer: the tool's params, or a refusal. */
export type FillRow = Row<RequestInput & { readonly command: StateCommand["type"] }, Readonly<Record<string, unknown>>>;

/** One whole request, for scoring the loop end to end: where it starts and where it must end. */
export type RequestRow = {
  readonly goal: string;
  readonly form: string;
  readonly query: string;
  readonly names: readonly string[];
  readonly turns: number;
  /** True when the loop must stop and ask the user to rephrase, changing nothing. */
  readonly unclear?: boolean;
  readonly start: Pick<PanelState, "categories" | "itemData">;
  readonly expected: Pick<PanelState, "categories" | "itemData">;
};

export type ExampleRows = {
  readonly stop: readonly StopRow[];
  readonly choose: readonly ChooseRow[];
  readonly fill: readonly FillRow[];
  readonly request: readonly RequestRow[];
};

const keepPanel = (state: PanelState): Pick<PanelState, "categories" | "itemData"> => ({ categories: state.categories, itemData: state.itemData });

/** Splits a command into its type and its params. Low, Sonar 0. */
function splitCommand(command: StateCommand): { readonly type: StateCommand["type"]; readonly args: Readonly<Record<string, unknown>> } {
  const { type, ...args } = command;
  return { type, args };
}

/**
 * Plays one example through the real executor, one turn per command, and writes a stop,
 * choose and fill row per turn, each with the context at that turn. The last turn only says
 * nothing more is needed. Low, Sonar 1.
 */
export function playExample(example: Example, start: PanelState): ExampleRows {
  if (example.unclear === true) return playUnclear(example, start);
  const states = example.commands.reduce<readonly PanelState[]>((visited, command) => [...visited, executeCommand(visited.at(-1) ?? start, expandCommand(command), STAMP)], [start]);
  const meta = { goal: example.goal, form: example.form };
  const inputs = states.map((state) => ({ query: example.query, context: formatContext(state, CONDITION_FORMATS, example.names) }));
  const fillContexts = states.map((state) => formatContextJson(state, CONDITION_FORMATS, example.names));
  const turns = example.commands.map((command, at) => ({ ...splitCommand(command), input: inputs[at] ?? inputs[0]!, fillContext: fillContexts[at] ?? "[]" }));
  const last = inputs.at(-1) ?? inputs[0]!;

  return {
    stop: [
      ...turns.map(({ input }) => ({ input, output: { reason: "work-needed" as const }, meta })),
      { input: last, output: { reason: "nothing-needed" as const }, meta },
    ],
    choose: turns.map(({ input, type }) => ({ input, output: COMMAND_PARTS[type as ToolType], meta: { ...meta, command: type } })),
    fill: turns.map(({ input, fillContext, type, args }) => ({ input: { query: input.query, context: fillContext, command: type }, output: toToolArgs(TOOL_PARAMS[type as ToolType], args), meta })),
    request: [{
      goal: example.goal,
      form: example.form,
      query: example.query,
      names: example.names,
      turns: example.commands.length,
      start: keepPanel(start),
      expected: keepPanel(states.at(-1) ?? start),
    }],
  };
}

/** Plays a request with no right command: not done, and the next step is to ask the user to rephrase. Low, Sonar 0. */
function playUnclear(example: Example, start: PanelState): ExampleRows {
  const meta = { goal: example.goal, form: example.form };
  const input = { query: example.query, context: formatContext(start, CONDITION_FORMATS, example.names) };

  return {
    stop: [{ input, output: { reason: "work-needed" }, meta }],
    choose: [{ input, output: { action: "rephrase" }, meta: { ...meta, command: REPHRASE } }],
    fill: [],
    request: [{ goal: example.goal, form: example.form, query: example.query, names: example.names, turns: 0, unclear: true, start: keepPanel(start), expected: keepPanel(start) }],
  };
}

/** Plays an example whose goal is already met: its commands run first, so the loop stops on turn 0. Low, Sonar 0. */
export const playNoOp = (example: Example, start: PanelState): ExampleRows =>
  playExample({ ...example, commands: [] }, example.commands.reduce((state, command) => executeCommand(state, expandCommand(command), STAMP), start));
