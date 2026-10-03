import type { Faker } from "@faker-js/faker";
import type { PanelState } from "../types.ts";
import { joinNames, listFilledCategories, listSeeders, pickListed, render, type Example } from "./example.ts";

const GOAL = "deleteSeeder";

const SINGLE = ["delete seeder {seeder}", "remove {seeder}", "get rid of {seeder}", "drop the {seeder} seeder"];
const BULK = ["delete every seeder in {category}", "clear out {category}", "remove all seeders from {category}"];
const LISTED = ["delete seeders {targets}", "remove {targets}", "drop {targets}"];

/** One seeder. Low, Sonar 0. */
function buildSingle(faker: Faker, state: PanelState): Example {
  const { category, seeder } = faker.helpers.arrayElement(listSeeders(state));

  return { goal: GOAL, form: "single", query: render(faker.helpers.arrayElement(SINGLE), { seeder }), names: [seeder], commands: [{ type: "deleteSeeder", category, seeder }] };
}

/** Every seeder in a category. Low, Sonar 0. */
function buildBulk(faker: Faker, state: PanelState): Example {
  const category = faker.helpers.arrayElement(listFilledCategories(state));

  return { goal: GOAL, form: "bulk", query: render(faker.helpers.arrayElement(BULK), { category }), names: [category], commands: [{ type: "deleteSeeders", targets: { category } }] };
}

/** 2-4 named seeders. Low, Sonar 0. */
function buildListed(faker: Faker, state: PanelState): Example {
  const seeders = pickListed(faker, listSeeders(state)).map((at) => at.seeder);

  return { goal: GOAL, form: "listed", query: render(faker.helpers.arrayElement(LISTED), { targets: joinNames(seeders) }), names: seeders, commands: [{ type: "deleteSeeders", targets: { seeders } }] };
}

export const deleteSeeder = { single: buildSingle, bulk: buildBulk, listed: buildListed };
