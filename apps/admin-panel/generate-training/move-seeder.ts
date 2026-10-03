import type { Faker } from "@faker-js/faker";
import type { PanelState } from "../types.ts";
import { drawCategoryName, listTakenNames } from "./build-state.ts";
import { joinNames, listFilledCategories, listSeeders, pickListed, render, type Example, type PatternSet } from "./example.ts";

const GOAL = "moveSeeder";

const PATTERNS = {
  seen: {
    single: ["move {target} to {to}", "{target} goes in {to}", "put {target} under {to}", "move {target} into {to}"],
    bulkMove: ["move everything from {category} to {to}", "move all seeders in {category} to {to}"],
    bulkMerge: ["merge {category} into {to}"],
    listed: ["move {targets} to {to}", "{targets} go in {to}", "put {targets} under {to}"],
  },
  unseen: {
    single: ["relocate {target} to {to}", "{target} belongs in {to}", "shift {target} over to {to}"],
    bulkMove: ["relocate everything in {category} to {to}", "shift all of {category} over to {to}"],
    bulkMerge: ["fold {category} into {to}", "combine {category} with {to}"],
    listed: ["relocate {targets} to {to}", "{targets} belong in {to}", "shift {targets} over to {to}"],
  },
};

type Patterns = (typeof PATTERNS)["seen"];

/** Picks a target category other than `from`: existing, or a new name. Low, Sonar 1. */
function pickDestination(faker: Faker, state: PanelState, from: string): string {
  const existing = state.categories.map((category) => category.name).filter((name) => name !== from);

  if (existing.length === 0 || faker.datatype.boolean(0.4)) return drawCategoryName(faker, listTakenNames(state));
  return faker.helpers.arrayElement(existing);
}

/** A seeder moves, or a whole category merges: the same words, told apart by the context. Low, Sonar 1. */
function buildSingle(faker: Faker, state: PanelState, patterns: Patterns): Example {
  const pattern = faker.helpers.arrayElement(patterns.single);

  if (faker.datatype.boolean(0.3)) {
    const category = faker.helpers.arrayElement(listFilledCategories(state));
    const to = pickDestination(faker, state, category);
    return { goal: GOAL, form: "single", query: render(pattern, { target: category, to }), names: [category, to], commands: [{ type: "mergeCategory", category, into: to }] };
  }

  const { category, seeder } = faker.helpers.arrayElement(listSeeders(state));
  const to = pickDestination(faker, state, category);
  return { goal: GOAL, form: "single", query: render(pattern, { target: seeder, to }), names: [seeder, to], commands: [{ type: "moveSeeder", category, seeder, toCategory: to }] };
}

/** Every seeder of a category moves; merge also deletes the emptied one. Low, Sonar 1. */
function buildBulk(faker: Faker, state: PanelState, patterns: Patterns): Example {
  const category = faker.helpers.arrayElement(listFilledCategories(state));
  const to = pickDestination(faker, state, category);

  if (faker.datatype.boolean(0.3)) return { goal: GOAL, form: "bulk", query: render(faker.helpers.arrayElement(patterns.bulkMerge), { category, to }), names: [category, to], commands: [{ type: "mergeCategory", category, into: to }] };
  return { goal: GOAL, form: "bulk", query: render(faker.helpers.arrayElement(patterns.bulkMove), { category, to }), names: [category, to], commands: [{ type: "moveSeeders", targets: { category }, toCategory: to }] };
}

/** 2-4 named seeders move. Low, Sonar 0. */
function buildListed(faker: Faker, state: PanelState, patterns: Patterns): Example {
  const seeders = pickListed(faker, listSeeders(state)).map((at) => at.seeder);
  const to = pickDestination(faker, state, "");

  return { goal: GOAL, form: "listed", query: render(faker.helpers.arrayElement(patterns.listed), { targets: joinNames(seeders), to }), names: [...seeders, to], commands: [{ type: "moveSeeders", targets: { seeders }, toCategory: to }] };
}

export const moveSeeder = (set: PatternSet) => ({
  single: (faker: Faker, state: PanelState) => buildSingle(faker, state, PATTERNS[set]),
  bulk: (faker: Faker, state: PanelState) => buildBulk(faker, state, PATTERNS[set]),
  listed: (faker: Faker, state: PanelState) => buildListed(faker, state, PATTERNS[set]),
});
