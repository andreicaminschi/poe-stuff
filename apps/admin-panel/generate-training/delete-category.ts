import type { Faker } from "@faker-js/faker";
import type { PanelState } from "../types.ts";
import { joinNames, listEmptyCategories, pickListed, render, type Example, type PatternSet } from "./example.ts";

const GOAL = "deleteCategory";

const PATTERNS = {
  seen: {
    single: ["delete category {category}", "remove {category}", "get rid of the {category} category", "{category} is not needed"],
    listed: ["delete categories {targets}", "remove {targets}", "get rid of {targets}"],
  },
  unseen: {
    single: ["drop the {category} category", "{category} can go", "erase {category}"],
    listed: ["{targets} can go", "erase {targets}", "drop the categories {targets}"],
  },
};

/** One empty category. Low, Sonar 0. */
function buildSingle(faker: Faker, state: PanelState, patterns: readonly string[]): Example {
  const category = faker.helpers.arrayElement(listEmptyCategories(state));

  return { goal: GOAL, form: "single", query: render(faker.helpers.arrayElement(patterns), { category }), names: [category], commands: [{ type: "deleteCategory", names: [category] }] };
}

/** 2-4 empty categories. Low, Sonar 0. */
function buildListed(faker: Faker, state: PanelState, patterns: readonly string[]): Example {
  const names = pickListed(faker, listEmptyCategories(state));

  return { goal: GOAL, form: "listed", query: render(faker.helpers.arrayElement(patterns), { targets: joinNames(names) }), names, commands: [{ type: "deleteCategory", names }] };
}

export const deleteCategory = (set: PatternSet) => ({
  single: (faker: Faker, state: PanelState) => buildSingle(faker, state, PATTERNS[set].single),
  listed: (faker: Faker, state: PanelState) => buildListed(faker, state, PATTERNS[set].listed),
});
