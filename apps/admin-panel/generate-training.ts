import { en, Faker } from "@faker-js/faker";
import { REPHRASE, type DecisionOption } from "./decision-options.ts";
import { addConditions } from "./generate-training/add-conditions.ts";
import { addKnownItems } from "./generate-training/add-known-items.ts";
import { addTags } from "./generate-training/add-tags.ts";
import { buildState } from "./generate-training/build-state.ts";
import { buildTwoStep } from "./generate-training/build-two-step.ts";
import { createCategory } from "./generate-training/create-category.ts";
import { createSeeder } from "./generate-training/create-seeder.ts";
import { deleteCategory } from "./generate-training/delete-category.ts";
import { deleteSeeder } from "./generate-training/delete-seeder.ts";
import { entryRow, intentRow, type EntryRow, type IntentRow } from "./generate-training/classify-request.ts";
import { refuseRow } from "./generate-training/refuse-row.ts";
import type { BuildExample, Example, PatternSet } from "./generate-training/example.ts";
import { moveSeeder } from "./generate-training/move-seeder.ts";
import { playExample, playNoOp, type ExampleRows } from "./generate-training/play-example.ts";
import { unclear } from "./generate-training/unclear.ts";
import type { PanelState } from "./types.ts";

export type TrainingRows = ExampleRows & { readonly entry: readonly EntryRow[]; readonly intent: readonly IntentRow[] };

/** Every goal's builders, worded from one pattern set. Low, Sonar 0. */
const buildGoals = (set: PatternSet): Readonly<Record<string, Readonly<Record<string, BuildExample>>>> => ({
  addTags: addTags(set),
  addKnownItems: addKnownItems(set),
  addConditions: addConditions(set),
  createCategory: createCategory(set),
  createSeeder: createSeeder(set),
  deleteCategory: deleteCategory(set),
  deleteSeeder: deleteSeeder(set),
  moveSeeder: moveSeeder(set),
  unclear: unclear(set),
});

const NO_OP_GOALS = new Set(["addTags", "addKnownItems", "addConditions"]);
const NO_OP_SHARE = 0.3;
const TWO_STEP_PER_COUNT = 4;
const REFUSE_SHARE = 0.15;

/** Every goal's single-target builder, the pieces two-step requests are joined from. Low, Sonar 0. */
const listSingles = (goals: ReturnType<typeof buildGoals>): Readonly<Record<string, BuildExample>> =>
  Object.fromEntries(Object.entries(goals).flatMap(([goal, forms]) => (forms["single"] === undefined
    ? []
    : [[goal, forms["single"]]])));

/** Everything a choose row can name, in a fixed order: every command, then the way out. */
export const TRAINED_COMMANDS: readonly DecisionOption[] = [
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
  REPHRASE,
];

/**
 * Generates `count` examples per goal and form from one seed, each on a fresh random panel,
 * and returns their rows. The same seed returns the same rows. Low, Sonar 1.
 */
export function generateTraining(seed: number, count: number, set: PatternSet = "seen"): TrainingRows {
  const faker = new Faker({ locale: [en], seed });
  const goals = buildGoals(set);
  const single = Object.entries(goals).flatMap(([goal, forms]) => Object.values(forms).flatMap((build) => Array.from({ length: count }, () => {
    const start = buildState(faker);
    const example = build(faker, start);
    if (example.form === "listed") return classifyOnly(example, start);
    if (example.unclear === true) return { ...playExample(example, start), entry: [], intent: [] };
    const played = NO_OP_GOALS.has(goal) && example.form !== "bulk" && faker.datatype.boolean(NO_OP_SHARE)
      ? playNoOp(example, start)
      : playExample(example, start);
    const refused = faker.datatype.boolean(REFUSE_SHARE)
      ? [refuseRow(example, start)].filter((row) => row !== undefined)
      : [];

    return { ...played, fill: [...played.fill, ...refused], entry: [entryRow(example, start)], intent: [intentRow(example, start)] };
  })));
  const twoStep = Array.from({ length: count * TWO_STEP_PER_COUNT }, () => {
    const start = buildState(faker);
    return classifyOnly(buildTwoStep(faker, set, listSingles(goals), start), start);
  });
  const played = [...single, ...twoStep];

  return {
    stop: played.flatMap((rows) => rows.stop),
    choose: played.flatMap((rows) => rows.choose),
    fill: played.flatMap((rows) => rows.fill),
    request: played.flatMap((rows) => rows.request),
    entry: played.flatMap((rows) => rows.entry),
    intent: played.flatMap((rows) => rows.intent),
  };
}

/** The decision models and the filler only see single and bulk requests. Low, Sonar 0. */
const classifyOnly = (example: Example, start: PanelState): TrainingRows =>
  ({ stop: [], choose: [], fill: [], request: [], entry: [entryRow(example, start)], intent: [intentRow(example, start)] });
