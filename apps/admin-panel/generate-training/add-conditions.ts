import type { Faker } from "@faker-js/faker";
import type { StateCommand } from "../commands.ts";
import type { PanelState } from "../types.ts";
import { sampleCondition, type SampledCondition } from "./conditions.ts";
import { joinNames, listFilledCategories, listSeeders, pickListed, render, type Example, type PatternSet } from "./example.ts";

const GOAL = "addConditions";

const PATTERNS = {
  seen: {
    single: ["add {condition} to {seeder}", "{seeder} needs {condition}", "add condition {condition} to {seeder}", "only {condition} for {seeder}"],
    bulk: ["add {condition} to {category}", "in {category}, for all seeders add {condition}", "every seeder in {category} gets {condition}"],
    listed: ["add {condition} to {targets}", "add condition {condition} to {targets}", "{targets} need {condition}"],
  },
  unseen: {
    single: ["{seeder} should require {condition}", "restrict {seeder} to {condition}", "give {seeder} a {condition} condition"],
    bulk: ["restrict all of {category} to {condition}", "every seeder under {category} should require {condition}", "give everything in {category} a {condition} condition"],
    listed: ["restrict {targets} to {condition}", "{targets} should require {condition}", "give {targets} a {condition} condition"],
  },
};

/** The patch the agent must write: the sentinel, never values. Code expands it before it runs. Low, Sonar 0. */
const writeAdd = (condition: SampledCondition) => ({ conditions: { [condition.key]: condition.sentinel } }) as unknown as NonNullable<Extract<StateCommand, { type: "updateSeeder" }>["add"]>;

/** One seeder gets a condition. Low, Sonar 0. */
function buildSingle(faker: Faker, state: PanelState, patterns: readonly string[]): Example {
  const condition = sampleCondition(faker);
  const { category, seeder } = faker.helpers.arrayElement(listSeeders(state));

  return {
    goal: GOAL,
    form: "single",
    query: render(faker.helpers.arrayElement(patterns), { condition: condition.text, seeder }),
    names: [condition.word, seeder],
    commands: [{ type: "updateSeeder", category, seeder, add: writeAdd(condition) }],
  };
}

/** Every seeder in a category gets a condition. Low, Sonar 0. */
function buildBulk(faker: Faker, state: PanelState, patterns: readonly string[]): Example {
  const condition = sampleCondition(faker);
  const category = faker.helpers.arrayElement(listFilledCategories(state));

  return {
    goal: GOAL,
    form: "bulk",
    query: render(faker.helpers.arrayElement(patterns), { condition: condition.text, category }),
    names: [condition.word, category],
    commands: [{ type: "updateSeeders", targets: { category }, add: writeAdd(condition) }],
  };
}

/** 2-4 named seeders get a condition. Low, Sonar 0. */
function buildListed(faker: Faker, state: PanelState, patterns: readonly string[]): Example {
  const condition = sampleCondition(faker);
  const seeders = pickListed(faker, listSeeders(state)).map((at) => at.seeder);

  return {
    goal: GOAL,
    form: "listed",
    query: render(faker.helpers.arrayElement(patterns), { condition: condition.text, targets: joinNames(seeders) }),
    names: [condition.word, ...seeders],
    commands: [{ type: "updateSeeders", targets: { seeders }, add: writeAdd(condition) }],
  };
}

export const addConditions = (set: PatternSet) => ({
  single: (faker: Faker, state: PanelState) => buildSingle(faker, state, PATTERNS[set].single),
  bulk: (faker: Faker, state: PanelState) => buildBulk(faker, state, PATTERNS[set].bulk),
  listed: (faker: Faker, state: PanelState) => buildListed(faker, state, PATTERNS[set].listed),
});
