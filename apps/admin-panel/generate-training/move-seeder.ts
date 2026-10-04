import type { Faker } from "@faker-js/faker";
import type { PanelState } from "../types.ts";
import { drawCategoryName, listTakenNames } from "./build-state.ts";
import { joinNames, listFilledCategories, listSeeders, pickListed, render, type Example, type PatternSet } from "./example.ts";

const GOAL = "moveSeeder";

const PATTERNS = {
  seen: {
    single: [
      "move {target} to {to}", "{target} goes in {to}", "put {target} under {to}", "move {target} into {to}", "move {target} over to {to}", "put {target} in {to}",
      "{target} goes under {to}", "move {target} under {to}", "put {target} into {to}", "transfer {target} to {to}", "{target} should go in {to}", "send {target} to {to}",
    ],
    bulkMove: [
      "move everything from {category} to {to}", "move all seeders in {category} to {to}", "move every seeder in {category} into {to}", "put all seeders of {category} in {to}",
      "transfer everything in {category} to {to}", "send all seeders from {category} to {to}", "move each seeder in {category} over to {to}", "everything in {category} goes in {to}",
      "put every seeder from {category} under {to}", "move the seeders of {category} to {to}",
    ],
    bulkMerge: [
      "merge {category} into {to}", "merge {category} with {to}", "merge the {category} category into {to}", "join {category} into {to}", "{category} merges into {to}",
      "join {category} with {to}", "put the whole {category} category into {to}", "move the whole {category} category into {to}", "{category} should merge into {to}", "make {category} part of {to}",
    ],
    listed: ["move {targets} to {to}", "{targets} go in {to}", "put {targets} under {to}"],
  },
  unseen: {
    single: [
      "relocate {target} to {to}", "{target} belongs in {to}", "shift {target} over to {to}", "migrate {target} to {to}", "reassign {target} to {to}",
      "{target} lives in {to} now", "carry {target} across to {to}", "rehome {target} in {to}", "{target} needs to sit in {to}", "push {target} into {to}",
    ],
    bulkMove: [
      "relocate everything in {category} to {to}", "shift all of {category} over to {to}", "migrate every seeder under {category} to {to}", "reassign all seeders under {category} to {to}",
      "carry everything under {category} across to {to}", "rehome all seeders of {category} in {to}", "push every seeder under {category} into {to}", "everything under {category} belongs in {to}",
      "the seeders under {category} live in {to} now", "relocate each seeder of {category} to {to}",
    ],
    bulkMerge: [
      "fold {category} into {to}", "combine {category} with {to}", "absorb {category} into {to}", "{category} gets absorbed by {to}", "unify {category} with {to}",
      "fuse {category} into {to}", "consolidate {category} into {to}", "roll {category} up into {to}", "blend {category} into {to}", "integrate {category} into {to}",
    ],
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
