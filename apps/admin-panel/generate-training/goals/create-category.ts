import type { Faker } from "@faker-js/faker";
import type { PanelState } from "../../types.ts";
import { drawCategoryName, listTakenNames } from "../fake-panel/build-state.ts";
import { joinNames, render, type Example, type PatternSet } from "../example.ts";

const GOAL = "createCategory";

const PATTERNS = {
  seen: {
    named: [
      "create category {name}", "new category {name}", "add a category called {name}", "create a category named {name}", "add category {name}",
      "create a new category called {name}", "add a new category named {name}", "new category called {name}", "create the {name} category", "add the category {name}",
    ],
    listed: ["create categories {targets}", "new categories {targets}", "add categories called {targets}"],
  },
  unseen: {
    named: [
      "I need a category named {name}", "set up a {name} category", "make category {name}", "start a category called {name}", "open a new {name} category",
      "I want a {name} category", "build a category named {name}", "we need a {name} category", "establish category {name}", "make me a {name} category",
    ],
    listed: ["set up categories {targets}", "I need categories named {targets}", "make categories {targets}"],
  },
};

type Patterns = (typeof PATTERNS)["seen"];

/** Draws new category names. Low, Sonar 0. */
function drawNames(faker: Faker, state: PanelState, count: number): readonly string[] {
  const taken = new Set(listTakenNames(state));

  return Array.from({ length: count }, () => {
    const name = drawCategoryName(faker, taken);
    taken.add(name);
    return name;
  });
}

/** One named category. Low, Sonar 0. */
function buildSingle(faker: Faker, state: PanelState, patterns: Patterns): Example {
  const names = drawNames(faker, state, 1);
  return { goal: GOAL, form: "single", query: render(faker.helpers.arrayElement(patterns.named), { name: names[0] ?? "" }), names, commands: [{ type: "createCategory", names }] };
}

/** 2-4 named categories. Low, Sonar 0. */
function buildListed(faker: Faker, state: PanelState, patterns: Patterns): Example {
  const names = drawNames(faker, state, faker.number.int({ min: 2, max: 4 }));

  return { goal: GOAL, form: "listed", query: render(faker.helpers.arrayElement(patterns.listed), { targets: joinNames(names) }), names, commands: [{ type: "createCategory", names }] };
}

export const createCategory = (set: PatternSet) => ({
  single: (faker: Faker, state: PanelState) => buildSingle(faker, state, PATTERNS[set]),
  listed: (faker: Faker, state: PanelState) => buildListed(faker, state, PATTERNS[set]),
});
