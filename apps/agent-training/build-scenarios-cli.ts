import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { parseArgs } from "node:util";
import { createLakeService } from "@poe/lake/service";
import { checkState } from "@poe/panel-state/check-state";
import { loadState, type CategoriesFile } from "@poe/panel-state/load-state";
import { SPLIT_DEFAULTS } from "@poe/panel-state/split-defaults";
import { buildScenarios, type PlayedScenario } from "./build-scenarios.ts";

const STATE_KEY = "admin-panel/versions/latest/categories.json";
const REVIEW_FILE = ".s3/agent-training/scenarios-review.md";

/** Writes one scenario as a review block: request, setup, then each step with its summary. */
function renderScenario(scenario: PlayedScenario, index: number): string {
  const setup = scenario.setup.length === 0
    ? []
    : ["Setup, the state the user had:", "```", ...scenario.setup.map((command) => JSON.stringify(command)), "```"];
  const steps = scenario.steps.length === 0
    ? [`Plan: none, the Router answers \`${scenario.kind === "already-done"
        ? "already-done"
        : "rephrase"}\`.`]
    : scenario.steps.flatMap((command, at) => [`Step ${at + 1}: \`${JSON.stringify(command)}\``, "```", ...(scenario.played[at]?.lines ?? []), "```"]);

  return [`### ${scenario.kind} ${index + 1}`, "", `Request: "${scenario.request}"`, "", ...setup, ...steps].join("\n");
}

/** Builds a sample of every scenario kind off the promoted state and writes it as a review file. */
async function main(): Promise<void> {
  const { values } = parseArgs({ options: { "per-kind": { type: "string", default: "3" }, seed: { type: "string", default: "1" } } });
  const state = loadState(await createLakeService().readJson<CategoriesFile>(STATE_KEY), SPLIT_DEFAULTS);
  const problems = checkState(state, SPLIT_DEFAULTS);

  if (problems.length > 0) throw new Error(`The promoted state breaks the contract:\n${problems.join("\n")}`);
  const scenarios = buildScenarios(state, Number(values["per-kind"]), Number(values.seed));
  const kinds = [...new Set(scenarios.map((scenario) => scenario.kind))];
  const sections = kinds.map((kind) => [`## ${kind}`, "", ...scenarios.filter((scenario) => scenario.kind === kind).map(renderScenario)].join("\n\n"));

  mkdirSync(dirname(REVIEW_FILE), { recursive: true });
  writeFileSync(REVIEW_FILE, `# Scenarios for review\n\nBuilt off \`${STATE_KEY}\`. Every step ran through the real executor; the block under it is its summary.\n\n${sections.join("\n\n")}\n`);
  console.log(`${scenarios.length} scenarios of ${kinds.length} kinds → ${REVIEW_FILE}`);
}

await main();
