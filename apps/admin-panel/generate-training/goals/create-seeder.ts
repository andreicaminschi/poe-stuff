import type { Faker } from "@faker-js/faker";
import type { PanelState } from "../../types.ts";
import { drawSeederName, listTakenNames } from "../fake-panel/build-state.ts";
import { joinNames, render, type Example, type PatternSet } from "../example.ts";

const GOAL = "createSeeder";

const PATTERNS = {
  seen: {
    named: [
      "create seeder {name} in {category}", "add a seeder called {name} to {category}", "new seeder {name} under {category}", "create a seeder named {name} in {category}",
      "add seeder {name} to {category}", "new seeder called {name} in {category}", "create the {name} seeder in {category}", "add a new seeder {name} to {category}",
      "in {category}, create seeder {name}", "add the seeder {name} under {category}",
    ],
    listed: ["create seeders {targets} in {category}", "add seeders {targets} to {category}", "new seeders {targets} under {category}"],
  },
  unseen: {
    named: [
      "set up a {name} seeder under {category}", "I need a seeder named {name} in {category}", "make seeder {name} for {category}", "start a seeder called {name} in {category}",
      "I want a {name} seeder in {category}", "build seeder {name} inside {category}", "open a {name} seeder in {category}", "we need a {name} seeder for {category}",
      "establish seeder {name} in {category}", "make me a {name} seeder under {category}",
    ],
    listed: ["set up seeders {targets} under {category}", "I need seeders named {targets} in {category}", "make seeders {targets} for {category}"],
  },
};

type Patterns = (typeof PATTERNS)["seen"];

/** Draws new seeder names. Low, Sonar 0. */
function drawNames(faker: Faker, state: PanelState, count: number): readonly string[] {
  const taken = new Set(listTakenNames(state));

  return Array.from({ length: count }, () => {
    const name = drawSeederName(faker, taken);
    taken.add(name);
    return name;
  });
}

/** One named seeder in any category. Low, Sonar 0. */
function buildSingle(faker: Faker, state: PanelState, patterns: Patterns): Example {
  const category = faker.helpers.arrayElement(state.categories).name;
  const names = drawNames(faker, state, 1);
  return { goal: GOAL, form: "single", query: render(faker.helpers.arrayElement(patterns.named), { name: names[0] ?? "", category }), names: [...names, category], commands: [{ type: "createSeeder", category, names }] };
}

/** 2-4 named seeders in one category. Low, Sonar 0. */
function buildListed(faker: Faker, state: PanelState, patterns: Patterns): Example {
  const category = faker.helpers.arrayElement(state.categories).name;
  const names = drawNames(faker, state, faker.number.int({ min: 2, max: 4 }));

  return { goal: GOAL, form: "listed", query: render(faker.helpers.arrayElement(patterns.listed), { targets: joinNames(names), category }), names: [...names, category], commands: [{ type: "createSeeder", category, names }] };
}

export const createSeeder = (set: PatternSet) => ({
  single: (faker: Faker, state: PanelState) => buildSingle(faker, state, PATTERNS[set]),
  listed: (faker: Faker, state: PanelState) => buildListed(faker, state, PATTERNS[set]),
});
