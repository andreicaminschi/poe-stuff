import type { Faker } from "@faker-js/faker";
import type { PanelState } from "../types.ts";
import { joinNames, listFilledCategories, listSeeders, pickListed, render, type Example, type PatternSet } from "./example.ts";

const GOAL = "deleteSeeder";

const PATTERNS = {
  seen: {
    single: ["delete seeder {seeder}", "remove {seeder}", "get rid of {seeder}", "drop the {seeder} seeder"],
    bulk: ["delete every seeder in {category}", "clear out {category}", "remove all seeders from {category}"],
    listed: ["delete seeders {targets}", "remove {targets}", "drop {targets}"],
  },
  unseen: {
    single: ["{seeder} can go", "erase {seeder}", "throw away {seeder}"],
    bulk: ["empty {category}", "erase every seeder under {category}", "throw away all of {category}"],
    listed: ["{targets} can go", "erase {targets}", "throw away {targets}"],
  },
};

/** One seeder. Low, Sonar 0. */
function buildSingle(faker: Faker, state: PanelState, patterns: readonly string[]): Example {
  const { category, seeder } = faker.helpers.arrayElement(listSeeders(state));

  return { goal: GOAL, form: "single", query: render(faker.helpers.arrayElement(patterns), { seeder }), names: [seeder], commands: [{ type: "deleteSeeder", category, seeder }] };
}

/** Every seeder in a category. Low, Sonar 0. */
function buildBulk(faker: Faker, state: PanelState, patterns: readonly string[]): Example {
  const category = faker.helpers.arrayElement(listFilledCategories(state));

  return { goal: GOAL, form: "bulk", query: render(faker.helpers.arrayElement(patterns), { category }), names: [category], commands: [{ type: "deleteSeeders", targets: { category } }] };
}

/** 2-4 named seeders. Low, Sonar 0. */
function buildListed(faker: Faker, state: PanelState, patterns: readonly string[]): Example {
  const seeders = pickListed(faker, listSeeders(state)).map((at) => at.seeder);

  return { goal: GOAL, form: "listed", query: render(faker.helpers.arrayElement(patterns), { targets: joinNames(seeders) }), names: seeders, commands: [{ type: "deleteSeeders", targets: { seeders } }] };
}

export const deleteSeeder = (set: PatternSet) => ({
  single: (faker: Faker, state: PanelState) => buildSingle(faker, state, PATTERNS[set].single),
  bulk: (faker: Faker, state: PanelState) => buildBulk(faker, state, PATTERNS[set].bulk),
  listed: (faker: Faker, state: PanelState) => buildListed(faker, state, PATTERNS[set].listed),
});
