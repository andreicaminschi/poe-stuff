import type { Faker } from "@faker-js/faker";
import type { PanelState } from "../types.ts";
import { sampleCondition } from "./conditions.ts";
import { joinNames, listFilledCategories, listSeeders, pickListed, render, type Example } from "./example.ts";

const GOAL = "addConditions";

const SINGLE = ["add {condition} {value} to {seeder}", "{seeder} needs {condition} {value}", "set {condition} to {value} on {seeder}", "only {condition} {value} for {seeder}"];
const BULK = ["add {condition} {value} to {category}", "in {category}, for all seeders add {condition} {value}", "every seeder in {category} gets {condition} {value}"];
const LISTED = ["add {condition} {value} to {targets}", "set {condition} to {value} on {targets}", "{targets} need {condition} {value}"];

/** One seeder gets a condition. Low, Sonar 0. */
function buildSingle(faker: Faker, state: PanelState): Example {
  const condition = sampleCondition(faker);
  const { category, seeder } = faker.helpers.arrayElement(listSeeders(state));

  return {
    goal: GOAL,
    form: "single",
    query: render(faker.helpers.arrayElement(SINGLE), { condition: condition.key, value: condition.text, seeder }),
    names: [condition.key, seeder],
    commands: [{ type: "updateSeeder", category, seeder, add: { conditions: { [condition.key]: condition.values } } }],
  };
}

/** Every seeder in a category gets a condition. Low, Sonar 0. */
function buildBulk(faker: Faker, state: PanelState): Example {
  const condition = sampleCondition(faker);
  const category = faker.helpers.arrayElement(listFilledCategories(state));

  return {
    goal: GOAL,
    form: "bulk",
    query: render(faker.helpers.arrayElement(BULK), { condition: condition.key, value: condition.text, category }),
    names: [condition.key, category],
    commands: [{ type: "updateSeeders", targets: { category }, add: { conditions: { [condition.key]: condition.values } } }],
  };
}

/** 2-4 named seeders get a condition. Low, Sonar 0. */
function buildListed(faker: Faker, state: PanelState): Example {
  const condition = sampleCondition(faker);
  const seeders = pickListed(faker, listSeeders(state)).map((at) => at.seeder);

  return {
    goal: GOAL,
    form: "listed",
    query: render(faker.helpers.arrayElement(LISTED), { condition: condition.key, value: condition.text, targets: joinNames(seeders) }),
    names: [condition.key, ...seeders],
    commands: [{ type: "updateSeeders", targets: { seeders }, add: { conditions: { [condition.key]: condition.values } } }],
  };
}

export const addConditions = { single: buildSingle, bulk: buildBulk, listed: buildListed };
