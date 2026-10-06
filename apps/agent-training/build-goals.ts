import { executeCommand } from "@poe/panel-state/execute-command";
import { SUMMARY_CONFIG } from "@poe/panel-state/summary-config";
import type { PanelState } from "@poe/panel-state/types";
import { summarizeDiff } from "@util/diff-summary/summarize-diff";
import { CONDITION_GOALS } from "./build-goals/condition-goals.ts";
import { deriveSeed } from "./build-goals/derive-seed.ts";
import { DONE_GOALS } from "./build-goals/done-goals.ts";
import { ITEM_GOALS } from "./build-goals/item-goals.ts";
import { KNOWN_ITEM_GOALS } from "./build-goals/known-item-goals.ts";
import { MULTI_STEP_GOALS } from "./build-goals/multi-step-goals.ts";
import { REPHRASE_GOALS } from "./build-goals/rephrase-goals.ts";
import { STRUCTURE_GOALS } from "./build-goals/structure-goals.ts";
import { TAG_GOALS } from "./build-goals/tag-goals.ts";
import { garbleRequest, listMentionedNames, listProtectedStrings } from "./build-goals/garble-request.ts";
import type { Goal, GoalBuilder, GoalDraft } from "./types.ts";

/** Every goal kind, by name. */
export const GOAL_BUILDERS: Readonly<Record<string, GoalBuilder>> = {
  ...TAG_GOALS,
  ...CONDITION_GOALS,
  ...KNOWN_ITEM_GOALS,
  ...STRUCTURE_GOALS,
  ...ITEM_GOALS,
  ...MULTI_STEP_GOALS,
  ...REPHRASE_GOALS,
  ...DONE_GOALS,
};

/** Tries per goal before a kind is declared unbuildable. */
const MAX_ATTEMPTS = 20;

export type PlayedStep = { readonly before: PanelState; readonly after: PanelState; readonly lines: readonly string[] };

/** A goal checked against the executor, with each step's states and summary, and the seed it was built from. */
export type PlayedGoal = Goal & { readonly seed: number; readonly start: PanelState; readonly played: readonly PlayedStep[] };

/**
 * Runs a goal's setup, then its steps, through the real executor. Returns undefined when a
 * command is refused or a step changes nothing, since neither can teach a model the right plan.
 */
function playGoal(state: PanelState, goal: Goal, seed: number): PlayedGoal | undefined {
  try {
    const start = goal.setup.reduce(executeCommand, state);
    const played: PlayedStep[] = [];
    let before = start;
    for (const command of goal.steps) {
      const after = executeCommand(before, command);
      const lines = summarizeDiff({ start, before, after }, SUMMARY_CONFIG);
      if (lines[0] === "no changes") return undefined;
      played.push({ before, after, lines });
      before = after;
    }
    return { ...goal, seed, start, played };
  } catch {
    return undefined;
  }
}

/** Capitalizes a request's first letter. */
const capitalize = (request: string): string => `${request.charAt(0).toUpperCase()}${request.slice(1)}`;

/** Lists every name the state holds: categories, seeders and items. */
const listStoredNames = (state: PanelState): readonly string[] => [
  ...Object.keys(state.categories),
  ...Object.values(state.categories).flatMap((category) => Object.keys(category.seeders ?? {})),
  ...Object.keys(state.items),
];

/** Files a builder's draft under its kind, and puts typos in one request in four. A goal with no commands keeps its request clean. */
function fileGoal(state: PanelState, kind: string, draft: GoalDraft, seed: number): Goal {
  const clean = capitalize(draft.request);
  const commands = [...draft.setup, ...draft.steps];
  const request = commands.length === 0
    ? clean
    : garbleRequest(clean, [...listProtectedStrings(commands), ...listMentionedNames(clean, listStoredNames(state))], deriveSeed(seed, "typos"));

  return { ...draft, kind, request, clean };
}

/** Builds one goal of one kind from its own seed, retrying with the next seed until it plays. Throws when no attempt does. */
function buildOneGoal(state: PanelState, kind: string, builder: GoalBuilder, seed: number): PlayedGoal {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const attemptSeed = deriveSeed(seed, `attempt-${attempt}`);
    const played = playGoal(state, fileGoal(state, kind, builder(state, attemptSeed), attemptSeed), attemptSeed);
    if (played !== undefined) return played;
  }
  throw new Error(`No playable ${kind} goal after ${MAX_ATTEMPTS} attempts from seed ${seed}.`);
}

/**
 * Builds `perKind` goals of every kind from the real state, each checked against the executor.
 * Every goal's seed comes from the run seed, its kind and its index, so one seed always gives the same goals.
 */
export const buildGoals = (state: PanelState, perKind: number, seed: number): readonly PlayedGoal[] =>
  Object.entries(GOAL_BUILDERS).flatMap(([kind, builder]) =>
    Array.from({ length: perKind }, (_, index) => buildOneGoal(state, kind, builder, deriveSeed(seed, `${kind}-${index}`))));
