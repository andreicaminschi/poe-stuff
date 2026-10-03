import type { Faker } from "@faker-js/faker";
import type { PanelState } from "../types.ts";
import { drawCategoryName, listTakenNames } from "./build-state.ts";
import { joinNames, listFilledCategories, listSeeders, pickListed, render, type Example } from "./example.ts";

const GOAL = "moveSeeder";

const SINGLE = ["move {target} to {to}", "{target} goes in {to}", "put {target} under {to}", "move {target} into {to}"];
const BULK_MOVE = ["move everything from {category} to {to}", "move all seeders in {category} to {to}"];
const BULK_MERGE = ["merge {category} into {to}"];
const LISTED = ["move {targets} to {to}", "{targets} go in {to}", "put {targets} under {to}"];

/** Picks a target category other than `from`: existing, or a new name. Low, Sonar 1. */
function pickDestination(faker: Faker, state: PanelState, from: string): string {
  const existing = state.categories.map((category) => category.name).filter((name) => name !== from);

  if (existing.length === 0 || faker.datatype.boolean(0.4)) return drawCategoryName(faker, listTakenNames(state));
  return faker.helpers.arrayElement(existing);
}

/** A seeder moves, or a whole category merges: the same words, told apart by the context. Low, Sonar 1. */
function buildSingle(faker: Faker, state: PanelState): Example {
  const pattern = faker.helpers.arrayElement(SINGLE);

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
function buildBulk(faker: Faker, state: PanelState): Example {
  const category = faker.helpers.arrayElement(listFilledCategories(state));
  const to = pickDestination(faker, state, category);

  if (faker.datatype.boolean(0.3)) return { goal: GOAL, form: "bulk", query: render(faker.helpers.arrayElement(BULK_MERGE), { category, to }), names: [category, to], commands: [{ type: "mergeCategory", category, into: to }] };
  return { goal: GOAL, form: "bulk", query: render(faker.helpers.arrayElement(BULK_MOVE), { category, to }), names: [category, to], commands: [{ type: "moveSeeders", targets: { category }, toCategory: to }] };
}

/** 2-4 named seeders move. Low, Sonar 0. */
function buildListed(faker: Faker, state: PanelState): Example {
  const seeders = pickListed(faker, listSeeders(state)).map((at) => at.seeder);
  const to = pickDestination(faker, state, "");

  return { goal: GOAL, form: "listed", query: render(faker.helpers.arrayElement(LISTED), { targets: joinNames(seeders), to }), names: [...seeders, to], commands: [{ type: "moveSeeders", targets: { seeders }, toCategory: to }] };
}

export const moveSeeder = { single: buildSingle, bulk: buildBulk, listed: buildListed };
