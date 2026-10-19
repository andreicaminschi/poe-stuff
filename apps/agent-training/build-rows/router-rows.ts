import type { PlayedScenario } from "../build-scenarios.ts";
import type { RouterRow } from "../types.ts";
import { describeContext } from "./describe-context.ts";
import { formatInput, listDoneLines } from "./format-input.ts";

/**
 * Cuts a scenario into Router rows: one per step, labelled with that step's command type. A scenario
 * with no steps gives one row, `already-done` when the state satisfies it and `rephrase` otherwise.
 */
export function buildRouterRows(scenario: PlayedScenario, index: number): readonly RouterRow[] {
  const source = { scenario: index, kind: scenario.kind };

  if (scenario.steps.length === 0) {
    const label = scenario.kind === "already-done"
      ? "already-done"
      : "rephrase";
    return [{ ...source, input: formatInput(scenario.request, describeContext(scenario.request, scenario.start), []), label }];
  }
  return scenario.steps.map((command, at) => ({
    ...source,
    input: formatInput(scenario.request, describeContext(scenario.request, scenario.played[at]?.before ?? scenario.start), listDoneLines(scenario, at)),
    label: command.type,
  }));
}
