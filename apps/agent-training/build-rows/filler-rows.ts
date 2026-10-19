import type { PlayedScenario } from "../build-scenarios.ts";
import type { FillerRow } from "../types.ts";
import { describeContext } from "@poe/agent-input/describe-context";
import { formatFillerInput, formatInput } from "@poe/agent-input/format-input";
import { listDoneLines } from "./format-input.ts";

/**
 * Cuts a scenario into Filler rows: one per step. The input adds the command type the Router chose,
 * and the answer is that command's params as compact JSON, without its `type`.
 */
export const buildFillerRows = (scenario: PlayedScenario, index: number): readonly FillerRow[] =>
  scenario.steps.map((command, at) => ({
    scenario: index,
    kind: scenario.kind,
    input: formatFillerInput(formatInput(scenario.request, describeContext(scenario.request, scenario.played[at]?.before ?? scenario.start), listDoneLines(scenario, at)), command.type),
    output: JSON.stringify(Object.fromEntries(Object.entries(command).filter(([key]) => key !== "type"))),
  }));
