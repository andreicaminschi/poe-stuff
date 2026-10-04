import type { Faker } from "@faker-js/faker";
import type { PanelState } from "../types.ts";
import { joinNames, listFilledCategories, listSeeders, pickListed, render, type Example, type PatternSet } from "./example.ts";

const GOAL = "deleteSeeder";

const PATTERNS = {
  seen: {
    single: [
      "delete seeder {seeder}", "remove {seeder}", "get rid of {seeder}", "delete {seeder}", "remove the seeder {seeder}", "delete the {seeder} seeder",
      "get rid of the {seeder} seeder", "{seeder} is not needed", "remove seeder {seeder}", "{seeder} is no longer needed", "delete the seeder called {seeder}",
    ],
    bulk: [
      "delete every seeder in {category}", "clear out {category}", "remove all seeders from {category}", "delete all seeders in {category}", "remove everything in {category}",
      "get rid of every seeder in {category}", "delete everything in {category}", "remove each seeder in {category}", "get rid of all seeders in {category}", "clear all seeders out of {category}",
    ],
    listed: ["delete seeders {targets}", "remove {targets}", "get rid of {targets}"],
  },
  unseen: {
    single: [
      "{seeder} can go", "erase {seeder}", "throw away {seeder}", "drop the {seeder} seeder", "trash {seeder}",
      "discard seeder {seeder}", "wipe out {seeder}", "scrap the {seeder} seeder", "{seeder} is obsolete", "ditch {seeder}",
    ],
    bulk: [
      "empty {category}", "erase every seeder under {category}", "throw away all of {category}", "drop all seeders under {category}", "trash everything under {category}",
      "discard each seeder under {category}", "wipe out the seeders under {category}", "scrap all of {category}", "ditch every seeder under {category}", "eliminate everything under {category}",
    ],
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
