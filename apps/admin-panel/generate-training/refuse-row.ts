import { CONDITION_FORMATS } from "../condition-values.ts";
import { formatContext } from "../format-context.ts";
import type { PanelState } from "../types.ts";
import type { Example } from "./example.ts";
import type { FillRow } from "./play-example.ts";

const CONDITION_KEYS = new Set(CONDITION_FORMATS.map((condition) => condition.key));

/**
 * The same request with its targets missing from the context, as when the panel finds no
 * name in it. The filler must refuse. Undefined for commands that name no target. Low, Sonar 1.
 */
export function refuseRow(example: Example, start: PanelState): FillRow | undefined {
  const [command] = example.commands;
  if (command === undefined || command.type === "createCategory") return undefined;
  const names = example.names.filter((name) => CONDITION_KEYS.has(name));

  return {
    goal: example.goal,
    form: "refuse",
    query: example.query,
    context: formatContext(start, CONDITION_FORMATS, names),
    history: [],
    command: command.type,
    args: { refuse: "missing-target" },
  };
}
