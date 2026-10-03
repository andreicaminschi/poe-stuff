import { en, Faker } from "@faker-js/faker";
import type { StateCommand } from "./commands.ts";
import { addConditions } from "./generate-training/add-conditions.ts";
import { addKnownItems } from "./generate-training/add-known-items.ts";
import { addTags } from "./generate-training/add-tags.ts";
import { buildState } from "./generate-training/build-state.ts";
import { createCategory } from "./generate-training/create-category.ts";
import { createSeeder } from "./generate-training/create-seeder.ts";
import { deleteCategory } from "./generate-training/delete-category.ts";
import { deleteSeeder } from "./generate-training/delete-seeder.ts";
import type { BuildExample } from "./generate-training/example.ts";
import { moveSeeder } from "./generate-training/move-seeder.ts";
import { playExample, playNoOp, type ExampleRows } from "./generate-training/play-example.ts";

const GOALS: Readonly<Record<string, Readonly<Record<string, BuildExample>>>> = {
  addTags,
  addKnownItems,
  addConditions,
  createCategory,
  createSeeder,
  deleteCategory,
  deleteSeeder,
  moveSeeder,
};

const NO_OP_GOALS = new Set(["addTags", "addKnownItems", "addConditions"]);
const NO_OP_SHARE = 0.1;

/** Every command a generated row can name, in a fixed order. */
export const TRAINED_COMMANDS: readonly StateCommand["type"][] = [
  "createCategory",
  "deleteCategory",
  "createSeeder",
  "updateSeeder",
  "deleteSeeder",
  "moveSeeder",
  "updateSeeders",
  "deleteSeeders",
  "moveSeeders",
  "mergeCategory",
  "updateItems",
];

/**
 * Generates `count` examples per goal and form from one seed, each on a fresh random panel,
 * and returns their rows. The same seed returns the same rows. Low, Sonar 1.
 */
export function generateTraining(seed: number, count: number): ExampleRows {
  const faker = new Faker({ locale: [en], seed });
  const played = Object.entries(GOALS).flatMap(([goal, forms]) => Object.values(forms).flatMap((build) => Array.from({ length: count }, () => {
    const start = buildState(faker);
    const example = build(faker, start);

    return NO_OP_GOALS.has(goal) && example.form !== "bulk" && faker.datatype.boolean(NO_OP_SHARE)
      ? playNoOp(example, start)
      : playExample(example, start);
  })));

  return {
    stop: played.flatMap((rows) => rows.stop),
    choose: played.flatMap((rows) => rows.choose),
    fill: played.flatMap((rows) => rows.fill),
  };
}
