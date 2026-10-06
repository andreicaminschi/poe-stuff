import type { GoalBuilder } from "../types.ts";
import { deriveSeed } from "./derive-seed.ts";
import { MULTI_STEP_GOALS } from "./multi-step-goals.ts";
import { pickOne } from "./pick.ts";
import { STRUCTURE_GOALS } from "./structure-goals.ts";

/** Single-step goals whose result the existence-only context can show: the name exists, is gone, or sits elsewhere. */
const VISIBLE_SINGLE_STEP = ["create-category", "create-seeder", "rename-seeder", "rename-category", "move-seeder", "move-seeders"]
  .map((kind) => STRUCTURE_GOALS[kind])
  .filter((builder): builder is GoalBuilder => builder !== undefined);

/** Multi-step goals whose first step's result the existence-only context can show. */
const VISIBLE_FIRST_STEP = ["create-category-and-move", "create-category-and-seeder", "rename-and-tag", "create-move-tag"]
  .map((kind) => MULTI_STEP_GOALS[kind])
  .filter((builder): builder is GoalBuilder => builder !== undefined);

/**
 * Builds a request the state already satisfies: a single-step goal whose step has moved into the
 * setup. Only shapes the context can show are drawn, so the input differs from the same request
 * still to do. The Router answers `already-done`.
 */
const buildAlreadyDoneGoal: GoalBuilder = (state, seed) => {
  const goal = pickOne(VISIBLE_SINGLE_STEP, "a visible single-step goal", deriveSeed(seed, "kind"))(state, deriveSeed(seed, "goal"));

  return { request: goal.request, setup: [...goal.setup, ...goal.steps], steps: [] };
};

/** Builds a request half done already: a multi-step goal whose first step has moved into the setup, so the plan is only what is left. */
const buildPartlyDoneGoal: GoalBuilder = (state, seed) => {
  const goal = pickOne(VISIBLE_FIRST_STEP, "a multi-step goal with a visible first step", deriveSeed(seed, "kind"))(state, deriveSeed(seed, "goal"));
  const [first, ...rest] = goal.steps;

  return { request: goal.request, setup: first === undefined
    ? goal.setup
    : [...goal.setup, first], steps: rest };
};

/** Requests whose work is all or partly in the state already. */
export const DONE_GOALS: Readonly<Record<string, GoalBuilder>> = {
  "already-done": buildAlreadyDoneGoal,
  "partly-done": buildPartlyDoneGoal,
};
