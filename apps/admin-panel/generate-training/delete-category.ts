import type { Faker } from "@faker-js/faker";
import type { PanelState } from "../types.ts";
import { joinNames, listEmptyCategories, pickListed, render, type Example } from "./example.ts";

const GOAL = "deleteCategory";

const SINGLE = ["delete category {category}", "remove {category}", "get rid of the {category} category", "{category} is not needed"];
const LISTED = ["delete categories {targets}", "remove {targets}", "get rid of {targets}"];

/** One empty category. Low, Sonar 0. */
function buildSingle(faker: Faker, state: PanelState): Example {
  const category = faker.helpers.arrayElement(listEmptyCategories(state));

  return { goal: GOAL, form: "single", query: render(faker.helpers.arrayElement(SINGLE), { category }), names: [category], commands: [{ type: "deleteCategory", names: [category] }] };
}

/** 2-4 empty categories. Low, Sonar 0. */
function buildListed(faker: Faker, state: PanelState): Example {
  const names = pickListed(faker, listEmptyCategories(state));

  return { goal: GOAL, form: "listed", query: render(faker.helpers.arrayElement(LISTED), { targets: joinNames(names) }), names, commands: [{ type: "deleteCategory", names }] };
}

export const deleteCategory = { single: buildSingle, listed: buildListed };
