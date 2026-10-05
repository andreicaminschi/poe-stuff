import type { Faker } from "@faker-js/faker";
import type { PanelState } from "../../types.ts";
import { drawTag } from "../fake-panel/build-state.ts";
import { joinNames, listFilledCategories, listItems, listSeeders, pickListed, render, type Example, type Form, type PatternSet } from "../example.ts";

const GOAL = "addTags";

const PATTERNS = {
  seen: {
    single: [
      "add tag {tag} to {target}", "tag {target} {tag}", "{target} is {tag}", "mark {target} as {tag}", "tag {target} as {tag}", "add the {tag} tag to {target}",
      "put a {tag} tag on {target}", "{target} gets tag {tag}", "set tag {tag} on {target}", "mark {target} {tag}", "{target} should get the {tag} tag", "add {tag} as a tag on {target}",
    ],
    bulk: [
      "add tag {tag} to {category}", "tag everything in {category} {tag}", "all seeders in {category} are {tag}", "mark all of {category} as {tag}", "tag every seeder in {category} as {tag}",
      "add the {tag} tag to all seeders in {category}", "put a {tag} tag on everything in {category}", "every seeder in {category} is {tag}", "set tag {tag} on all of {category}",
      "tag the whole {category} category {tag}", "mark each seeder in {category} {tag}", "{category} seeders get the {tag} tag",
    ],
    listed: ["add tag {tag} to {targets}", "tag {targets} {tag}", "{targets} are {tag}"],
  },
  unseen: {
    single: [
      "give {target} the {tag} tag", "{target} should be tagged {tag}", "label {target} {tag}", "flag {target} as {tag}", "stamp {target} with {tag}",
      "{target} counts as {tag}", "classify {target} as {tag}", "I want {target} labelled {tag}", "label {target} with {tag}", "{target} deserves the {tag} tag",
    ],
    bulk: [
      "label all of {category} as {tag}", "give everything under {category} the {tag} tag", "flag every seeder under {category} as {tag}", "stamp all of {category} with {tag}",
      "classify everything under {category} as {tag}", "the whole of {category} counts as {tag}", "label each one under {category} {tag}", "I want everything under {category} labelled {tag}",
      "give all {category} seeders the {tag} tag", "flag the entire {category} category {tag}",
    ],
    listed: ["give {targets} the {tag} tag", "label {targets} {tag}", "{targets} should be tagged {tag}"],
  },
};

/** One seeder or one item gets a tag. Low, Sonar 1. */
function buildSingle(faker: Faker, state: PanelState, patterns: readonly string[]): Example {
  const tag = drawTag(faker);
  const pattern = faker.helpers.arrayElement(patterns);
  const base = { goal: GOAL, form: "single" as Form };

  if (faker.datatype.boolean()) {
    const { item } = faker.helpers.arrayElement(listItems(state));
    return { ...base, query: render(pattern, { tag, target: item }), names: [item], commands: [{ type: "updateItems", items: [item], add: { tags: [tag] } }] };
  }

  const { category, seeder } = faker.helpers.arrayElement(listSeeders(state));
  return { ...base, query: render(pattern, { tag, target: seeder }), names: [seeder], commands: [{ type: "updateSeeder", category, seeder, add: { tags: [tag] } }] };
}

/** Every seeder in a category gets a tag. Low, Sonar 0. */
function buildBulk(faker: Faker, state: PanelState, patterns: readonly string[]): Example {
  const tag = drawTag(faker);
  const category = faker.helpers.arrayElement(listFilledCategories(state));

  return {
    goal: GOAL,
    form: "bulk",
    query: render(faker.helpers.arrayElement(patterns), { tag, category }),
    names: [category],
    commands: [{ type: "updateSeeders", targets: { category }, add: { tags: [tag] } }],
  };
}

/** 2-4 named seeders, or 2-4 named items, get a tag. Low, Sonar 1. */
function buildListed(faker: Faker, state: PanelState, patterns: readonly string[]): Example {
  const tag = drawTag(faker);
  const pattern = faker.helpers.arrayElement(patterns);
  const base = { goal: GOAL, form: "listed" as Form };

  if (faker.datatype.boolean()) {
    const items = pickListed(faker, listItems(state)).map((at) => at.item);
    return { ...base, query: render(pattern, { tag, targets: joinNames(items) }), names: items, commands: [{ type: "updateItems", items, add: { tags: [tag] } }] };
  }

  const seeders = pickListed(faker, listSeeders(state)).map((at) => at.seeder);
  return { ...base, query: render(pattern, { tag, targets: joinNames(seeders) }), names: seeders, commands: [{ type: "updateSeeders", targets: { seeders }, add: { tags: [tag] } }] };
}

export const addTags = (set: PatternSet) => ({
  single: (faker: Faker, state: PanelState) => buildSingle(faker, state, PATTERNS[set].single),
  bulk: (faker: Faker, state: PanelState) => buildBulk(faker, state, PATTERNS[set].bulk),
  listed: (faker: Faker, state: PanelState) => buildListed(faker, state, PATTERNS[set].listed),
});
