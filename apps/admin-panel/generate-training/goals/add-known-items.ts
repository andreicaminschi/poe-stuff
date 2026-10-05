import type { Faker } from "@faker-js/faker";
import type { PanelState } from "../../types.ts";
import { drawUniqueName, listTakenNames } from "../fake-panel/build-state.ts";
import { joinNames, listFilledCategories, listItems, listSeeders, render, type Example, type Form, type PatternSet } from "../example.ts";

const GOAL = "addKnownItems";

const PATTERNS = {
  seen: {
    single: [
      "add {unique} to {target}", "{unique} goes in {target}", "put {unique} under {target}", "link {unique} to {target}", "add {unique} as a known item to {target}", "{target} gets {unique}",
      "put {unique} in {target}", "add known item {unique} to {target}", "link {unique} with {target}", "{unique} goes under {target}", "add the unique {unique} to {target}",
    ],
    bulk: [
      "add {unique} to every seeder in {category}", "put {unique} in all of {category}", "{unique} goes in each seeder of {category}", "link {unique} to all seeders in {category}",
      "add known item {unique} to everything in {category}", "every seeder in {category} gets {unique}", "put {unique} under every seeder in {category}", "add the unique {unique} to all of {category}",
      "link {unique} with each seeder in {category}", "{unique} goes in all seeders of {category}",
    ],
    listed: ["add {uniques} to {target}", "{uniques} go in {target}", "put {uniques} under {target}"],
  },
  unseen: {
    single: [
      "{target} should include {unique}", "attach {unique} to {target}", "{unique} belongs to {target}", "hook {unique} up to {target}", "{target} should contain {unique}",
      "register {unique} under {target}", "associate {unique} with {target}", "{unique} is part of {target}", "include {unique} in {target}", "file {unique} under {target}",
    ],
    bulk: [
      "attach {unique} to all seeders under {category}", "every seeder under {category} should include {unique}", "{unique} belongs in all of {category}", "hook {unique} up to everything under {category}",
      "register {unique} under every seeder of {category}", "associate {unique} with all of {category}", "include {unique} in each one under {category}", "everything under {category} should contain {unique}",
      "file {unique} under all of {category}", "{unique} is part of every seeder under {category}",
    ],
    listed: ["attach {uniques} to {target}", "{target} should include {uniques}", "{uniques} belong to {target}"],
  },
};

/** Draws 1-4 new unique names. Low, Sonar 0. */
function drawUniques(faker: Faker, state: PanelState, count: number): readonly string[] {
  const taken = new Set(listTakenNames(state));

  return Array.from({ length: count }, () => {
    const name = drawUniqueName(faker, taken);
    taken.add(name);
    return name;
  });
}

/** Known items go on one seeder or one item. Low, Sonar 1. */
function buildOnTarget(faker: Faker, state: PanelState, form: Form, uniques: readonly string[], pattern: string): Example {
  const values = { unique: uniques[0] ?? "", uniques: joinNames(uniques) };

  if (faker.datatype.boolean()) {
    const { item } = faker.helpers.arrayElement(listItems(state));
    return { goal: GOAL, form, query: render(pattern, { ...values, target: item }), names: [...uniques, item], commands: [{ type: "updateItems", items: [item], add: { knownItems: uniques } }] };
  }

  const { category, seeder } = faker.helpers.arrayElement(listSeeders(state));
  return { goal: GOAL, form, query: render(pattern, { ...values, target: seeder }), names: [...uniques, seeder], commands: [{ type: "updateSeeder", category, seeder, add: { knownItems: uniques } }] };
}

const buildSingle = (faker: Faker, state: PanelState, patterns: readonly string[]): Example =>
  buildOnTarget(faker, state, "single", drawUniques(faker, state, 1), faker.helpers.arrayElement(patterns));

const buildListed = (faker: Faker, state: PanelState, patterns: readonly string[]): Example =>
  buildOnTarget(faker, state, "listed", drawUniques(faker, state, faker.number.int({ min: 2, max: 4 })), faker.helpers.arrayElement(patterns));

/** A known item goes on every seeder in a category. Low, Sonar 0. */
function buildBulk(faker: Faker, state: PanelState, patterns: readonly string[]): Example {
  const [unique = ""] = drawUniques(faker, state, 1);
  const category = faker.helpers.arrayElement(listFilledCategories(state));

  return {
    goal: GOAL,
    form: "bulk",
    query: render(faker.helpers.arrayElement(patterns), { unique, category }),
    names: [unique, category],
    commands: [{ type: "updateSeeders", targets: { category }, add: { knownItems: [unique] } }],
  };
}

export const addKnownItems = (set: PatternSet) => ({
  single: (faker: Faker, state: PanelState) => buildSingle(faker, state, PATTERNS[set].single),
  bulk: (faker: Faker, state: PanelState) => buildBulk(faker, state, PATTERNS[set].bulk),
  listed: (faker: Faker, state: PanelState) => buildListed(faker, state, PATTERNS[set].listed),
});
