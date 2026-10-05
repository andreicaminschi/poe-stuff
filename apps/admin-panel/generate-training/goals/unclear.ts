import type { Faker } from "@faker-js/faker";
import type { PanelState } from "../../types.ts";
import { drawSeederName, drawTag, listTakenNames } from "../fake-panel/build-state.ts";
import { render, type Example, type Form, type PatternSet } from "../example.ts";

const GOAL = "unclear";

const PATTERNS = {
  seen: {
    offTopic: [
      "what is {word}", "how do I farm {noun}", "hello", "tell me about {word}", "what time is it", "is {noun} worth it",
      "thanks", "who made this", "how much is {noun}", "what's new this league", "recommend a build",
    ],
    unknownName: [
      "tag {missing} {tag}", "delete seeder {missing}", "move {missing} to {other}", "add {other} to {missing}", "remove {missing}",
      "mark {missing} as {tag}", "put {missing} under {other}", "delete category {missing}", "add tag {tag} to {missing}", "get rid of {missing}",
    ],
    vague: [
      "fix the {noun}", "clean this up", "make it better", "do the thing", "sort out {noun}", "change it",
      "update stuff", "fix it", "make some changes", "redo the {noun}",
    ],
    noEntity: [
      "tag all {group} items with {tag}", "delete every {group} seeder", "move all {group} stuff to {other}", "mark the {group} ones {tag}",
      "remove anything {group}", "add {tag} to all {group} things", "tag {group} items {tag}", "delete the {group} items", "put every {group} item in {other}", "tag whatever is {group} as {tag}",
    ],
    unnamed: [
      "create a category", "add a new category", "create a new category", "new category", "add a category",
      "create an empty category", "add another category", "new seeder in {category}", "{category} needs a new seeder", "add a seeder to {category}",
      "create a seeder in {category}", "add a new seeder to {category}", "create an empty seeder in {category}", "add another seeder to {category}",
    ],
  },
  unseen: {
    offTopic: [
      "can you explain {word}", "where do I find {noun}", "good morning", "what does {word} mean", "any tips for {noun}",
      "how are you", "what should I play", "why is {noun} so rare", "cheers", "which league is this",
    ],
    unknownName: [
      "give {missing} the {tag} tag", "{missing} can go", "relocate {missing} to {other}", "label {missing} {tag}", "erase {missing}",
      "attach {other} to {missing}", "trash {missing}", "flag {missing} as {tag}", "shift {missing} over to {other}", "ditch {missing}",
    ],
    vague: ["tidy up the {noun}", "improve this", "handle it", "adjust the {noun}", "rework things", "touch it up", "tweak stuff", "polish the {noun}", "sort it", "deal with this"],
    noEntity: [
      "label every {group} drop {tag}", "erase all the {group} gear", "relocate the {group} loot to {other}", "flag {group} things as {tag}",
      "trash whatever counts as {group}", "give the {group} pieces the {tag} tag", "ditch the {group} junk", "shift {group} gear over to {other}", "stamp all {group} drops with {tag}", "scrap anything {group}",
    ],
    unnamed: [
      "I need another category", "set up an empty category", "one more category please", "make a fresh category", "start a blank category",
      "one more seeder for {category}", "set up an empty seeder in {category}", "I need another seeder in {category}", "make a fresh seeder in {category}", "start a blank seeder under {category}",
    ],
  },
};

const GROUPS = ["endgame", "leveling", "cheap", "expensive", "good", "bad", "league", "rare-ish", "early", "late game", "valuable", "useless"];

/** One request with no right command. The agent should ask the user to rephrase. Low, Sonar 1. */
function buildUnclear(faker: Faker, state: PanelState, form: Form, patterns: readonly string[]): Example {
  const taken = listTakenNames(state);
  const missing = drawSeederName(faker, taken);
  const other = drawSeederName(faker, new Set([...taken, missing]));
  const category = faker.helpers.arrayElement(state.categories).name;
  const query = render(faker.helpers.arrayElement(patterns), { word: faker.word.noun(), noun: faker.word.noun(), missing, other, category, tag: drawTag(faker), group: faker.helpers.arrayElement(GROUPS) });
  const names = form === "unknownName"
    ? [missing, other].filter((name) => query.includes(name)).sort((left, right) => query.indexOf(left) - query.indexOf(right))
    : [category].filter((name) => form === "unnamed" && query.includes(name));

  return { goal: GOAL, form, query, names, commands: [], unclear: true };
}

export const unclear = (set: PatternSet) => ({
  offTopic: (faker: Faker, state: PanelState) => buildUnclear(faker, state, "offTopic", PATTERNS[set].offTopic),
  unknownName: (faker: Faker, state: PanelState) => buildUnclear(faker, state, "unknownName", PATTERNS[set].unknownName),
  vague: (faker: Faker, state: PanelState) => buildUnclear(faker, state, "vague", PATTERNS[set].vague),
  noEntity: (faker: Faker, state: PanelState) => buildUnclear(faker, state, "noEntity", PATTERNS[set].noEntity),
  unnamed: (faker: Faker, state: PanelState) => buildUnclear(faker, state, "unnamed", PATTERNS[set].unnamed),
});
