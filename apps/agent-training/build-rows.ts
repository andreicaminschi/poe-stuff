import type { PlayedGoal } from "./build-goals.ts";
import { buildFillerRows } from "./build-rows/filler-rows.ts";
import { buildJudgeRows } from "./build-rows/judge-rows.ts";
import { buildRouterRows } from "./build-rows/router-rows.ts";
import type { Rows } from "./types.ts";

/** Cuts every played goal into training rows for the Router, the Filler and the Judge. A row keeps its goal's index, so splits can keep a goal's rows together. */
export const buildRows = (goals: readonly PlayedGoal[]): Rows => ({
  router: goals.flatMap((goal, index) => buildRouterRows(goal, index)),
  filler: goals.flatMap((goal, index) => buildFillerRows(goal, index)),
  judge: goals.flatMap((goal, index) => buildJudgeRows(goal, index, goals)),
});
