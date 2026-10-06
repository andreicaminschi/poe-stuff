import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { createLakeService } from "@poe/lake/service";
import { loadState, type CategoriesFile } from "@poe/panel-state/load-state";
import type { PanelState } from "@poe/panel-state/types";
import { buildGoals, type PlayedGoal } from "./build-goals.ts";
import type { RowSetManifest } from "./build-rows-cli.ts";
import { scoreFiller, type FillerPrediction, type FillerReport } from "./score-run/score-filler.ts";
import { scoreLabels, type LabelReport, type LabelledPrediction } from "./score-run/score-labels.ts";
import { splitGoal } from "./split-goals.ts";

const STATE_KEY = "admin-panel/versions/latest/categories.json";
const ROOT = ".s3/agent-training";

/** Reads a JSONL file into rows. */
const readJsonLines = <T>(path: string): readonly T[] =>
  readFileSync(path, "utf8").split("\n").filter((line) => line.trim() !== "").map((line) => JSON.parse(line) as T);

/** Lists a model's prediction files as row-set names: `eval-1__seen.jsonl` is the set `eval-1/seen`. */
function listPredictionSets(run: string, model: string): readonly string[] {
  const folder = `${ROOT}/runs/${run}/${model}/predictions`;
  return existsSync(folder)
    ? readdirSync(folder).filter((file) => file.endsWith(".jsonl")).map((file) => file.slice(0, -".jsonl".length).replaceAll("__", "/"))
    : [];
}

/** Rebuilds the goals a row set was cut from, from its manifest, so Filler predictions can run against each step's state. */
function rebuildGoals(state: PanelState, set: string): readonly PlayedGoal[] {
  const manifest = JSON.parse(readFileSync(`${ROOT}/${set}/manifest.json`, "utf8")) as RowSetManifest;
  const goals = buildGoals(state, manifest.perKind, manifest.seed);
  const seederNames = Object.values(state.categories).flatMap((category) => Object.keys(category.seeders ?? {}));
  const storedNames = [...Object.keys(state.categories), ...seederNames, ...Object.keys(state.items)];

  return manifest.part === "all"
    ? goals
    : goals.filter((goal) => splitGoal(goal, storedNames, seederNames) === manifest.part);
}

/** Formats a share as a percentage. */
const percent = (value: number): string => `${(value * 100).toFixed(1)}%`;

/** Writes one classifier's score on one set as report lines. */
function renderLabels(model: string, set: string, report: LabelReport): readonly string[] {
  const labels = Object.entries(report.perLabel).map(([label, score]) => `| ${label} | ${score.count} | ${percent(score.recall)} | ${percent(score.precision)} |`);
  const mutations = Object.entries(report.perMutation).map(([mutation, score]) => `| ${mutation} | ${score.count} | ${percent(score.caught / score.count)} |`);
  const kinds = report.worstKinds.map((kind) => `- ${kind.kind}: ${percent(kind.accuracy)} of ${kind.count}`);

  return [
    `### ${model} — ${set}: accuracy ${percent(report.accuracy)}, macro-F1 ${percent(report.macroF1)} (${report.count} rows)`,
    "", "| label | rows | recall | precision |", "|---|---|---|---|", ...labels, "",
    ...(mutations.length === 0
      ? []
      : ["| reject kind | rows | caught |", "|---|---|---|", ...mutations, ""]),
    ...(kinds.length === 0
      ? []
      : ["Weakest goal kinds:", ...kinds, ""]),
  ];
}

/** Writes the Filler's score on one set as report lines. */
function renderFiller(set: string, report: FillerReport): readonly string[] {
  const failures = report.failures.map((failure) => `- **${failure.kind}** — ${failure.why}\n  - expected \`${failure.expected}\`\n  - predicted \`${failure.predicted}\``);
  return [
    `### filler — ${set}: execution match ${percent(report.executionMatch)}, exact JSON ${percent(report.exactJson)}, valid JSON ${percent(report.validJson)} (${report.count} rows)`,
    "", ...(failures.length === 0
      ? []
      : ["Failures:", ...failures, ""]),
  ];
}

/**
 * Scores one training run's predictions on every set it predicted: Router and Judge by accuracy,
 * macro-F1, per-label recall and caught rejects; the Filler by execution match against the real
 * executor. Writes `report.md` into the run folder and prints the headline numbers.
 */
async function main(): Promise<void> {
  const { values } = parseArgs({ options: { run: { type: "string" } } });
  if (values.run === undefined) throw new Error("Pass --run=<folder under .s3/agent-training/runs>.");

  const state = loadState(await createLakeService().readJson<CategoriesFile>(STATE_KEY));
  const lines: string[] = [`# Run ${values.run}`, ""];
  const headline: string[] = [];

  for (const model of ["router", "judge"]) {
    for (const set of listPredictionSets(values.run, model)) {
      const report = scoreLabels(readJsonLines<LabelledPrediction>(`${ROOT}/runs/${values.run}/${model}/predictions/${set.replaceAll("/", "__")}.jsonl`));
      lines.push(...renderLabels(model, set, report));
      headline.push(`${model.padEnd(6)} ${set.padEnd(18)} accuracy ${percent(report.accuracy).padStart(6)}  macro-F1 ${percent(report.macroF1).padStart(6)}`);
    }
  }
  for (const set of listPredictionSets(values.run, "filler")) {
    const report = scoreFiller(readJsonLines<FillerPrediction>(`${ROOT}/runs/${values.run}/filler/predictions/${set.replaceAll("/", "__")}.jsonl`), rebuildGoals(state, set));
    lines.push(...renderFiller(set, report));
    headline.push(`filler ${set.padEnd(18)} execution ${percent(report.executionMatch).padStart(6)}  exact JSON ${percent(report.exactJson).padStart(6)}`);
  }

  writeFileSync(`${ROOT}/runs/${values.run}/report.md`, `${lines.join("\n")}\n`);
  console.log(headline.join("\n"));
  console.log(`report → ${ROOT}/runs/${values.run}/report.md`);
}

await main();
