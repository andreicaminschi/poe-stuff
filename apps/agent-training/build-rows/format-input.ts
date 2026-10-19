import type { PlayedScenario } from "../build-scenarios.ts";

/** Lists the summary lines of the steps a scenario already took before step `at`. */
export const listDoneLines = (scenario: PlayedScenario, at: number): readonly string[] =>
  scenario.played.slice(0, at).flatMap((step) => step.lines);
