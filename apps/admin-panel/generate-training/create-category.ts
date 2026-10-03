import type { Faker } from "@faker-js/faker";
import type { PanelState } from "../types.ts";
import { drawCategoryName, listTakenNames } from "./build-state.ts";
import { joinNames, render, type Example } from "./example.ts";

const GOAL = "createCategory";

const NAMED = ["create category {name}", "new category {name}", "add a category called {name}"];
const UNNAMED = ["make a new category", "create a category", "add a new category"];
const LISTED = ["create categories {targets}", "new categories {targets}", "add categories called {targets}"];

/** Draws new category names. Low, Sonar 0. */
function drawNames(faker: Faker, state: PanelState, count: number): readonly string[] {
  const taken = new Set(listTakenNames(state));

  return Array.from({ length: count }, () => {
    const name = drawCategoryName(faker, taken);
    taken.add(name);
    return name;
  });
}

/** One category, named or left to the code to name. Low, Sonar 1. */
function buildSingle(faker: Faker, state: PanelState): Example {
  if (faker.datatype.boolean(0.25)) return { goal: GOAL, form: "single", query: faker.helpers.arrayElement(UNNAMED), names: [], commands: [{ type: "createCategory", names: [""] }] };

  const names = drawNames(faker, state, 1);
  return { goal: GOAL, form: "single", query: render(faker.helpers.arrayElement(NAMED), { name: names[0] ?? "" }), names, commands: [{ type: "createCategory", names }] };
}

/** 2-4 named categories. Low, Sonar 0. */
function buildListed(faker: Faker, state: PanelState): Example {
  const names = drawNames(faker, state, faker.number.int({ min: 2, max: 4 }));

  return { goal: GOAL, form: "listed", query: render(faker.helpers.arrayElement(LISTED), { targets: joinNames(names) }), names, commands: [{ type: "createCategory", names }] };
}

export const createCategory = { single: buildSingle, listed: buildListed };
