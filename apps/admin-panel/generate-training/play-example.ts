import { executeCommand, type StateCommand } from "../commands.ts";
import { formatContext } from "../format-context.ts";
import type { PanelState } from "../types.ts";
import { CONDITION_FORMATS, expandCommand } from "../condition-values.ts";
import type { Example } from "./example.ts";

const STAMP = { id: "generated", at: "1970-01-01T00:00:00.000Z", actor: "generator" };

type RowBase = { readonly goal: string; readonly form: string; readonly query: string; readonly context: string; readonly history: readonly string[] };

export type StopRow = RowBase & { readonly done: boolean };
export type ChooseRow = RowBase & { readonly command: StateCommand["type"] };
export type FillRow = RowBase & { readonly command: StateCommand["type"]; readonly args: Readonly<Record<string, unknown>> };

/** One whole request, for scoring the loop end to end: where it starts and where it must end. */
export type RequestRow = {
  readonly goal: string;
  readonly form: string;
  readonly query: string;
  readonly names: readonly string[];
  readonly turns: number;
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
 * choose and fill row per turn. Each row carries the context and the commands run before
 * it. The last turn only says the goal is met. Low, Sonar 1.
 */
export function playExample(example: Example, start: PanelState): ExampleRows {
  const states = example.commands.reduce<readonly PanelState[]>((visited, command) => [...visited, executeCommand(visited.at(-1) ?? start, expandCommand(command), STAMP)], [start]);
  const ran = example.commands.map((command) => JSON.stringify(command));
  const bases = states.map((state, at) => ({
    goal: example.goal,
    form: example.form,
    query: example.query,
    context: formatContext(state, CONDITION_FORMATS, example.names),
    history: ran.slice(0, at),
  }));
  const turns = example.commands.map((command, at) => ({ ...splitCommand(command), base: bases[at] ?? bases[0]! }));
  const last = bases.at(-1) ?? bases[0]!;

  return {
    stop: [...turns.map(({ base }) => ({ ...base, done: false })), { ...last, done: true }],
    choose: turns.map(({ base, type }) => ({ ...base, command: type })),
    fill: turns.map(({ base, type, args }) => ({ ...base, command: type, args })),
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

/** Plays an example whose goal is already met: its commands run first, so the loop stops on turn 0. Low, Sonar 0. */
export const playNoOp = (example: Example, start: PanelState): ExampleRows =>
  playExample({ ...example, commands: [] }, example.commands.reduce((state, command) => executeCommand(state, expandCommand(command), STAMP), start));
