import { executeCommand } from "@poe/panel-state/execute-command";
import { SUMMARY_CONFIG } from "@poe/panel-state/summary-config";
import type { PanelState } from "@poe/panel-state/types";
import { summarizeDiff } from "@util/diff-summary/summarize-diff";
import { CONDITION_SCENARIOS } from "./build-scenarios/condition-scenarios.ts";
import { deriveSeed } from "./build-scenarios/derive-seed.ts";
import { DONE_SCENARIOS } from "./build-scenarios/done-scenarios.ts";
import { ITEM_SCENARIOS } from "./build-scenarios/item-scenarios.ts";
import { KNOWN_ITEM_SCENARIOS } from "./build-scenarios/known-item-scenarios.ts";
import { MULTI_STEP_SCENARIOS } from "./build-scenarios/multi-step-scenarios.ts";
import { REPHRASE_SCENARIOS } from "./build-scenarios/rephrase-scenarios.ts";
import { STRUCTURE_SCENARIOS } from "./build-scenarios/structure-scenarios.ts";
import { TAG_SCENARIOS } from "./build-scenarios/tag-scenarios.ts";
import { garbleRequest, listMentionedNames, listProtectedStrings } from "./build-scenarios/garble-request.ts";
import type { Scenario, ScenarioBuilder, ScenarioDraft } from "./types.ts";

/** Every scenario kind, by name. */
export const SCENARIO_BUILDERS: Readonly<Record<string, ScenarioBuilder>> = {
  ...TAG_SCENARIOS,
  ...CONDITION_SCENARIOS,
  ...KNOWN_ITEM_SCENARIOS,
  ...STRUCTURE_SCENARIOS,
  ...ITEM_SCENARIOS,
  ...MULTI_STEP_SCENARIOS,
  ...REPHRASE_SCENARIOS,
  ...DONE_SCENARIOS,
};

/** Tries per scenario before a kind is declared unbuildable. */
const MAX_ATTEMPTS = 20;

export type PlayedStep = { readonly before: PanelState; readonly after: PanelState; readonly lines: readonly string[] };

/** A scenario checked against the executor, with each step's states and summary, and the seed it was built from. */
export type PlayedScenario = Scenario & { readonly seed: number; readonly start: PanelState; readonly played: readonly PlayedStep[] };

/**
 * Runs a scenario's setup, then its steps, through the real executor. Returns undefined when a
 * command is refused or a step changes nothing, since neither can teach a model the right plan.
 */
function playScenario(state: PanelState, scenario: Scenario, seed: number): PlayedScenario | undefined {
  try {
    const start = scenario.setup.reduce(executeCommand, state);
    const played: PlayedStep[] = [];
    let before = start;
    for (const command of scenario.steps) {
      const after = executeCommand(before, command);
      const lines = summarizeDiff({ start, before, after }, SUMMARY_CONFIG);
      if (lines[0] === "no changes") return undefined;
      played.push({ before, after, lines });
      before = after;
    }
    return { ...scenario, seed, start, played };
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

/** Files a builder's draft under its kind, and puts typos in one request in four. A scenario with no commands keeps its request clean. */
function fileScenario(state: PanelState, kind: string, draft: ScenarioDraft, seed: number): Scenario {
  const clean = capitalize(draft.request);
  const commands = [...draft.setup, ...draft.steps];
  const request = commands.length === 0
    ? clean
    : garbleRequest(clean, [...listProtectedStrings(commands), ...listMentionedNames(clean, listStoredNames(state))], deriveSeed(seed, "typos"));

  return { ...draft, kind, request, clean };
}

/** Builds one scenario of one kind from its own seed, retrying with the next seed until it plays. Throws when no attempt does. */
function buildOneScenario(state: PanelState, kind: string, builder: ScenarioBuilder, seed: number): PlayedScenario {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const attemptSeed = deriveSeed(seed, `attempt-${attempt}`);
    const played = playScenario(state, fileScenario(state, kind, builder(state, attemptSeed), attemptSeed), attemptSeed);
    if (played !== undefined) return played;
  }
  throw new Error(`No playable ${kind} scenario after ${MAX_ATTEMPTS} attempts from seed ${seed}.`);
}

/**
 * Builds `perKind` scenarios of every kind from the real state, each checked against the executor.
 * Every scenario's seed comes from the run seed, its kind and its index, so one seed always gives the same scenarios.
 */
export const buildScenarios = (state: PanelState, perKind: number, seed: number): readonly PlayedScenario[] =>
  Object.entries(SCENARIO_BUILDERS).flatMap(([kind, builder]) =>
    Array.from({ length: perKind }, (_, index) => buildOneScenario(state, kind, builder, deriveSeed(seed, `${kind}-${index}`))));
