import type { PlayedScenario } from "./build-scenarios.ts";
import { buildFillerRows } from "./build-rows/filler-rows.ts";
import { buildJudgeRows } from "./build-rows/judge-rows.ts";
import { buildRouterRows } from "./build-rows/router-rows.ts";
import type { Rows } from "./types.ts";

/** Cuts every played scenario into training rows for the Router, the Filler and the Judge. A row keeps its scenario's index, so splits can keep a scenario's rows together. */
export const buildRows = (scenarios: readonly PlayedScenario[]): Rows => ({
  router: scenarios.flatMap((scenario, index) => buildRouterRows(scenario, index)),
  filler: scenarios.flatMap((scenario, index) => buildFillerRows(scenario, index)),
  judge: scenarios.flatMap((scenario, index) => buildJudgeRows(scenario, index, scenarios)),
});
