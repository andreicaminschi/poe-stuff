import type { Faker } from "@faker-js/faker";
import type { PanelState } from "../types.ts";
import { sampleCondition } from "./conditions.ts";
import { joinNames, listFilledCategories, listSeeders, pickListed, render, type Example, type PatternSet } from "./example.ts";

const GOAL = "addConditions";

const PATTERNS = {
  seen: {
    single: ["add {condition} {value} to {seeder}", "{seeder} needs {condition} {value}", "set {condition} to {value} on {seeder}", "only {condition} {value} for {seeder}"],
    bulk: ["add {condition} {value} to {category}", "in {category}, for all seeders add {condition} {value}", "every seeder in {category} gets {condition} {value}"],
    listed: ["add {condition} {value} to {targets}", "set {condition} to {value} on {targets}", "{targets} need {condition} {value}"],
  },
  unseen: {
    single: ["{seeder} should require {condition} {value}", "restrict {seeder} to {condition} {value}", "give {seeder} a {condition} {value} condition"],
    bulk: ["restrict all of {category} to {condition} {value}", "every seeder under {category} should require {condition} {value}", "give everything in {category} a {condition} {value} condition"],
    listed: ["restrict {targets} to {condition} {value}", "{targets} should require {condition} {value}", "give {targets} a {condition} {value} condition"],
  },
};

/** One seeder gets a condition. Low, Sonar 0. */
function buildSingle(faker: Faker, state: PanelState, patterns: readonly string[]): Example {
  const condition = sampleCondition(faker);
  const { category, seeder } = faker.helpers.arrayElement(listSeeders(state));

  return {
    goal: GOAL,
    form: "single",
    query: render(faker.helpers.arrayElement(patterns), { condition: condition.key, value: condition.text, seeder }),
    names: [condition.key, seeder],
    commands: [{ type: "updateSeeder", category, seeder, add: { conditions: { [condition.key]: condition.values } } }],
  };
}

/** Every seeder in a category gets a condition. Low, Sonar 0. */
function buildBulk(faker: Faker, state: PanelState, patterns: readonly string[]): Example {
  const condition = sampleCondition(faker);
  const category = faker.helpers.arrayElement(listFilledCategories(state));

  return {
    goal: GOAL,
    form: "bulk",
    query: render(faker.helpers.arrayElement(patterns), { condition: condition.key, value: condition.text, category }),
    names: [condition.key, category],
    commands: [{ type: "updateSeeders", targets: { category }, add: { conditions: { [condition.key]: condition.values } } }],
  };
}

/** 2-4 named seeders get a condition. Low, Sonar 0. */
function buildListed(faker: Faker, state: PanelState, patterns: readonly string[]): Example {
  const condition = sampleCondition(faker);
  const seeders = pickListed(faker, listSeeders(state)).map((at) => at.seeder);

  return {
    goal: GOAL,
    form: "listed",
    query: render(faker.helpers.arrayElement(patterns), { condition: condition.key, value: condition.text, targets: joinNames(seeders) }),
    names: [condition.key, ...seeders],
    commands: [{ type: "updateSeeders", targets: { seeders }, add: { conditions: { [condition.key]: condition.values } } }],
  };
}

export const addConditions = (set: PatternSet) => ({
  single: (faker: Faker, state: PanelState) => buildSingle(faker, state, PATTERNS[set].single),
  bulk: (faker: Faker, state: PanelState) => buildBulk(faker, state, PATTERNS[set].bulk),
  listed: (faker: Faker, state: PanelState) => buildListed(faker, state, PATTERNS[set].listed),
});
