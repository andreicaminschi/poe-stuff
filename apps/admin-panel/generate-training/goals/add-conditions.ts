import type { Faker } from "@faker-js/faker";
import type { StateCommand } from "../../commands.ts";
import type { PanelState } from "../../types.ts";
import { sampleCondition, type SampledCondition } from "../fake-panel/conditions.ts";
import { joinNames, listFilledCategories, listSeeders, pickListed, render, type Example, type PatternSet } from "../example.ts";

const GOAL = "addConditions";

const PATTERNS = {
  seen: {
    single: [
      "add {condition} to {seeder}", "{seeder} needs {condition}", "add condition {condition} to {seeder}", "only {condition} for {seeder}", "set {condition} on {seeder}", "{seeder} only shows {condition}",
      "put a {condition} condition on {seeder}", "limit {seeder} to {condition}", "add a {condition} rule to {seeder}", "{seeder} must be {condition}", "make {seeder} {condition} only", "filter {seeder} by {condition}",
    ],
    bulk: [
      "add {condition} to {category}", "in {category}, for all seeders add {condition}", "every seeder in {category} gets {condition}", "set {condition} on all of {category}",
      "limit everything in {category} to {condition}", "add a {condition} rule to all seeders in {category}", "only {condition} for every seeder in {category}",
      "put a {condition} condition on each seeder in {category}", "filter all of {category} by {condition}", "all seeders in {category} must be {condition}",
    ],
    listed: ["add {condition} to {targets}", "add condition {condition} to {targets}", "{targets} need {condition}"],
  },
  unseen: {
    single: [
      "{seeder} should require {condition}", "restrict {seeder} to {condition}", "give {seeder} a {condition} condition", "require {condition} on {seeder}", "constrain {seeder} to {condition}",
      "{seeder} has to be {condition}", "narrow {seeder} down to {condition}", "{seeder} applies to {condition} only", "lock {seeder} to {condition}", "{seeder} is just for {condition}",
    ],
    bulk: [
      "restrict all of {category} to {condition}", "every seeder under {category} should require {condition}", "give everything under {category} a {condition} condition",
      "require {condition} across {category}", "constrain everything under {category} to {condition}", "narrow all of {category} down to {condition}", "lock every seeder under {category} to {condition}",
      "the whole {category} category has to be {condition}", "{category} seeders apply to {condition} only", "everything under {category} is just for {condition}",
    ],
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
