import type { ScenarioBuilder } from "../types.ts";
import { deriveSeed } from "./derive-seed.ts";
import { MULTI_STEP_SCENARIOS } from "./multi-step-scenarios.ts";
import { pickOne } from "./pick.ts";
import { STRUCTURE_SCENARIOS } from "./structure-scenarios.ts";

/** Single-step scenarios whose result the existence-only context can show: the name exists, is gone, or sits elsewhere. */
const VISIBLE_SINGLE_STEP = ["create-category", "create-seeder", "rename-seeder", "rename-category", "move-seeder", "move-seeders"]
  .map((kind) => STRUCTURE_SCENARIOS[kind])
  .filter((builder): builder is ScenarioBuilder => builder !== undefined);

/** Multi-step scenarios whose first step's result the existence-only context can show. */
const VISIBLE_FIRST_STEP = ["create-category-and-move", "create-category-and-seeder", "rename-and-tag", "create-move-tag"]
  .map((kind) => MULTI_STEP_SCENARIOS[kind])
  .filter((builder): builder is ScenarioBuilder => builder !== undefined);

/**
 * Builds a request the state already satisfies: a single-step scenario whose step has moved into the
 * setup. Only shapes the context can show are drawn, so the input differs from the same request
 * still to do. The Router answers `already-done`.
 */
const buildAlreadyDoneScenario: ScenarioBuilder = (state, seed) => {
  const scenario = pickOne(VISIBLE_SINGLE_STEP, "a visible single-step scenario", deriveSeed(seed, "kind"))(state, deriveSeed(seed, "scenario"));

  return { request: scenario.request, setup: [...scenario.setup, ...scenario.steps], steps: [] };
};

/** Builds a request half done already: a multi-step scenario whose first step has moved into the setup, so the plan is only what is left. */
const buildPartlyDoneScenario: ScenarioBuilder = (state, seed) => {
  const scenario = pickOne(VISIBLE_FIRST_STEP, "a multi-step scenario with a visible first step", deriveSeed(seed, "kind"))(state, deriveSeed(seed, "scenario"));
  const [first, ...rest] = scenario.steps;

  return { request: scenario.request, setup: first === undefined
    ? scenario.setup
    : [...scenario.setup, first], steps: rest };
};

/** Requests whose work is all or partly in the state already. */
export const DONE_SCENARIOS: Readonly<Record<string, ScenarioBuilder>> = {
  "already-done": buildAlreadyDoneScenario,
  "partly-done": buildPartlyDoneScenario,
};
