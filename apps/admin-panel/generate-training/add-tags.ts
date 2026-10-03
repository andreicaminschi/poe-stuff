import type { Faker } from "@faker-js/faker";
import type { PanelState } from "../types.ts";
import { drawTag } from "./build-state.ts";
import { joinNames, listFilledCategories, listItems, listSeeders, pickListed, render, type Example, type Form } from "./example.ts";

const GOAL = "addTags";

const SINGLE = ["add tag {tag} to {target}", "tag {target} {tag}", "{target} is {tag}", "mark {target} as {tag}"];
const BULK = ["add tag {tag} to {category}", "tag everything in {category} {tag}", "all seeders in {category} are {tag}"];
const LISTED = ["add tag {tag} to {targets}", "tag {targets} {tag}", "{targets} are {tag}"];

/** One seeder or one item gets a tag. Low, Sonar 1. */
function buildSingle(faker: Faker, state: PanelState): Example {
  const tag = drawTag(faker);
  const pattern = faker.helpers.arrayElement(SINGLE);
  const base = { goal: GOAL, form: "single" as Form };

  if (faker.datatype.boolean()) {
    const { item } = faker.helpers.arrayElement(listItems(state));
    return { ...base, query: render(pattern, { tag, target: item }), names: [item], commands: [{ type: "updateItems", items: [item], add: { tags: [tag] } }] };
  }

  const { category, seeder } = faker.helpers.arrayElement(listSeeders(state));
  return { ...base, query: render(pattern, { tag, target: seeder }), names: [seeder], commands: [{ type: "updateSeeder", category, seeder, add: { tags: [tag] } }] };
}

/** Every seeder in a category gets a tag. Low, Sonar 0. */
function buildBulk(faker: Faker, state: PanelState): Example {
  const tag = drawTag(faker);
  const category = faker.helpers.arrayElement(listFilledCategories(state));

  return {
    goal: GOAL,
    form: "bulk",
    query: render(faker.helpers.arrayElement(BULK), { tag, category }),
    names: [category],
    commands: [{ type: "updateSeeders", targets: { category }, add: { tags: [tag] } }],
  };
}

/** 2-4 named seeders, or 2-4 named items, get a tag. Low, Sonar 1. */
function buildListed(faker: Faker, state: PanelState): Example {
  const tag = drawTag(faker);
  const pattern = faker.helpers.arrayElement(LISTED);
  const base = { goal: GOAL, form: "listed" as Form };

  if (faker.datatype.boolean()) {
    const items = pickListed(faker, listItems(state)).map((at) => at.item);
    return { ...base, query: render(pattern, { tag, targets: joinNames(items) }), names: items, commands: [{ type: "updateItems", items, add: { tags: [tag] } }] };
  }

  const seeders = pickListed(faker, listSeeders(state)).map((at) => at.seeder);
  return { ...base, query: render(pattern, { tag, targets: joinNames(seeders) }), names: seeders, commands: [{ type: "updateSeeders", targets: { seeders }, add: { tags: [tag] } }] };
}

export const addTags = { single: buildSingle, bulk: buildBulk, listed: buildListed };
