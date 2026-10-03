import type { Faker } from "@faker-js/faker";
import { executeCommand } from "../commands.ts";
import type { PanelState } from "../types.ts";
import { render, type BuildExample, type Example, type PatternSet } from "./example.ts";

const STAMP = { id: "generated", at: "1970-01-01T00:00:00.000Z", actor: "generator" };

const JOINERS = {
  seen: ["{first} and {second}", "{first}, then {second}", "{first}; also {second}"],
  unseen: ["{first} plus {second}", "first {first}, after that {second}", "{first} as well as {second}"],
};

const MAX_TRIES = 20;

/** Builds the second request on the state the first leaves, or undefined when it has no target there. Low, Sonar 1. */
function tryBuild(build: BuildExample, faker: Faker, state: PanelState): Example | undefined {
  try {
    return build(faker, state);
  } catch {
    return undefined;
  }
}

/** Joins two requests into one query whose commands run in order. Low, Sonar 0. */
const joinExamples = (faker: Faker, set: PatternSet, first: Example, second: Example): Example => ({
  goal: "twoStep",
  form: "single",
  query: render(faker.helpers.arrayElement(JOINERS[set]), { first: first.query, second: second.query }),
  names: [...new Set([...first.names, ...second.names])],
  commands: [...first.commands, ...second.commands],
});

/**
 * Two single requests from two different goals in one query, so a command has run and the
 * request is still not done. The second is built on the state the first leaves. Low, Sonar 2.
 */
export function buildTwoStep(faker: Faker, set: PatternSet, singles: Readonly<Record<string, BuildExample>>, start: PanelState): Example {
  for (let tries = 0; tries < MAX_TRIES; tries += 1) {
    const [firstGoal = "", secondGoal = ""] = faker.helpers.arrayElements(Object.keys(singles), 2);
    const first = singles[firstGoal]!(faker, start);
    const middle = first.commands.reduce((state, command) => executeCommand(state, command, STAMP), start);
    const second = tryBuild(singles[secondGoal]!, faker, middle);
    if (second !== undefined) return joinExamples(faker, set, first, second);
  }
  throw new Error("No two-step request fits this panel.");
}
