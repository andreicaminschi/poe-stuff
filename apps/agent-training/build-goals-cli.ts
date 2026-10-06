import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { parseArgs } from "node:util";
import { createLakeService } from "@poe/lake/service";
import { checkState } from "@poe/panel-state/check-state";
import { loadState, type CategoriesFile } from "@poe/panel-state/load-state";
import { buildGoals, type PlayedGoal } from "./build-goals.ts";

const STATE_KEY = "admin-panel/versions/latest/categories.json";
const REVIEW_FILE = ".s3/agent-training/goals-review.md";

/** Writes one goal as a review block: request, setup, then each step with its summary. */
function renderGoal(goal: PlayedGoal, index: number): string {
  const setup = goal.setup.length === 0
    ? []
    : ["Setup, the state the user had:", "```", ...goal.setup.map((command) => JSON.stringify(command)), "```"];
  const steps = goal.steps.length === 0
    ? [`Plan: none, the Router answers \`${goal.kind === "already-done"
        ? "already-done"
        : "rephrase"}\`.`]
    : goal.steps.flatMap((command, at) => [`Step ${at + 1}: \`${JSON.stringify(command)}\``, "```", ...(goal.played[at]?.lines ?? []), "```"]);

  return [`### ${goal.kind} ${index + 1}`, "", `Request: "${goal.request}"`, "", ...setup, ...steps].join("\n");
}

/** Builds a sample of every goal kind off the promoted state and writes it as a review file. */
async function main(): Promise<void> {
  const { values } = parseArgs({ options: { "per-kind": { type: "string", default: "3" }, seed: { type: "string", default: "1" } } });
  const state = loadState(await createLakeService().readJson<CategoriesFile>(STATE_KEY));
  const problems = checkState(state);

  if (problems.length > 0) throw new Error(`The promoted state breaks the contract:\n${problems.join("\n")}`);
  const goals = buildGoals(state, Number(values["per-kind"]), Number(values.seed));
  const kinds = [...new Set(goals.map((goal) => goal.kind))];
  const sections = kinds.map((kind) => [`## ${kind}`, "", ...goals.filter((goal) => goal.kind === kind).map(renderGoal)].join("\n\n"));

  mkdirSync(dirname(REVIEW_FILE), { recursive: true });
  writeFileSync(REVIEW_FILE, `# Goals for review\n\nBuilt off \`${STATE_KEY}\`. Every step ran through the real executor; the block under it is its summary.\n\n${sections.join("\n\n")}\n`);
  console.log(`${goals.length} goals of ${kinds.length} kinds → ${REVIEW_FILE}`);
}

await main();
