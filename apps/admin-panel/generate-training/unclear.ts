import type { Faker } from "@faker-js/faker";
import type { PanelState } from "../types.ts";
import { drawSeederName, drawTag, listTakenNames } from "./build-state.ts";
import { render, type Example, type Form, type PatternSet } from "./example.ts";

const GOAL = "unclear";

const PATTERNS = {
  seen: {
    offTopic: ["what is {word}", "how do I farm {noun}", "hello", "tell me about {word}", "what time is it", "is {noun} worth it"],
    unknownName: ["tag {missing} {tag}", "delete seeder {missing}", "move {missing} to {other}", "add {other} to {missing}"],
    vague: ["fix the {noun}", "clean this up", "make it better", "do the thing", "sort out {noun}", "change it"],
  },
  unseen: {
    offTopic: ["can you explain {word}", "where do I find {noun}", "good morning", "what does {word} mean"],
    unknownName: ["give {missing} the {tag} tag", "{missing} can go", "relocate {missing} to {other}"],
    vague: ["tidy up the {noun}", "improve this", "handle it", "adjust the {noun}"],
  },
};

/** One request with no right command. The agent should ask the user to rephrase. Low, Sonar 1. */
function buildUnclear(faker: Faker, state: PanelState, form: Form, patterns: readonly string[]): Example {
  const taken = listTakenNames(state);
  const missing = drawSeederName(faker, taken);
  const other = drawSeederName(faker, new Set([...taken, missing]));
  const query = render(faker.helpers.arrayElement(patterns), { word: faker.word.noun(), noun: faker.word.noun(), missing, other, tag: drawTag(faker) });
  const names = form === "unknownName"
    ? [missing, other].filter((name) => query.includes(name)).sort((left, right) => query.indexOf(left) - query.indexOf(right))
    : [];

  return { goal: GOAL, form, query, names, commands: [], unclear: true };
}

export const unclear = (set: PatternSet) => ({
  offTopic: (faker: Faker, state: PanelState) => buildUnclear(faker, state, "offTopic", PATTERNS[set].offTopic),
  unknownName: (faker: Faker, state: PanelState) => buildUnclear(faker, state, "unknownName", PATTERNS[set].unknownName),
  vague: (faker: Faker, state: PanelState) => buildUnclear(faker, state, "vague", PATTERNS[set].vague),
});
