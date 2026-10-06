import { mkdirSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { createLakeService } from "@poe/lake/service";
import { checkState } from "@poe/panel-state/check-state";
import { loadState, type CategoriesFile } from "@poe/panel-state/load-state";
import { buildGoals } from "./build-goals.ts";
import { buildRows } from "./build-rows.ts";
import type { Rows } from "./types.ts";

const STATE_KEY = "admin-panel/versions/latest/categories.json";

/** Writes one goal's rows as a review block: the request, then every row cut from it. */
function renderGoalRows(rows: Rows, goal: number): string {
  const router = rows.router.filter((row) => row.goal === goal).map((row) => `ROUTER → ${row.label}\n${row.input}`);
  const filler = rows.filler.filter((row) => row.goal === goal).map((row) => `FILLER → ${row.output}\n${row.input}`);
  const judge = rows.judge.filter((row) => row.goal === goal).map((row) => `JUDGE → ${row.label}${row.mutation === undefined
    ? ""
    : ` (${row.mutation})`}\n${row.input}`);

  return [...router, ...filler, ...judge].map((row) => `\`\`\`\n${row}\n\`\`\``).join("\n");
}

/** Writes the first goal of every kind with all its rows, so the rows can be read next to the goal they came from. */
function renderReview(rows: Rows, kinds: readonly { readonly kind: string; readonly goal: number }[]): string {
  const sections = kinds.map(({ kind, goal }) => `## ${kind}\n\n${renderGoalRows(rows, goal)}`);
  return `# Rows for review\n\nThe first goal of every kind, with every row cut from it.\n\n${sections.join("\n\n")}\n`;
}

/** Counts the rows of one model per label. */
const countLabels = (labels: readonly string[]): string =>
  Object.entries(Object.groupBy(labels, (label) => label)).map(([label, all]) => `${label} ${all?.length ?? 0}`).join(", ");

/** Builds goals off the promoted state, cuts them into rows, and writes one JSONL file per model plus a review file. */
async function main(): Promise<void> {
  const { values } = parseArgs({ options: { name: { type: "string" }, "per-kind": { type: "string", default: "50" }, seed: { type: "string", default: "1" } } });
  if (values.name === undefined) throw new Error("Pass --name=<folder under .s3/agent-training>.");

  const lake = createLakeService();
  const state = loadState(await lake.readJson<CategoriesFile>(STATE_KEY));
  const problems = checkState(state);
  if (problems.length > 0) throw new Error(`The promoted state breaks the contract:\n${problems.join("\n")}`);

  const goals = buildGoals(state, Number(values["per-kind"]), Number(values.seed));
  const rows = buildRows(goals);
  const folder = `agent-training/${values.name}`;
  const firstOfKind = goals.flatMap((goal, index) => (goals.findIndex((other) => other.kind === goal.kind) === index
    ? [{ kind: goal.kind, goal: index }]
    : []));

  await lake.writeJsonLines(`${folder}/router.jsonl`, rows.router);
  await lake.writeJsonLines(`${folder}/filler.jsonl`, rows.filler);
  await lake.writeJsonLines(`${folder}/judge.jsonl`, rows.judge);
  mkdirSync(`.s3/${folder}`, { recursive: true });
  writeFileSync(`.s3/${folder}/rows-review.md`, renderReview(rows, firstOfKind));

  console.log(`${goals.length} goals → .s3/${folder}/`);
  console.log(`router ${rows.router.length}: ${countLabels(rows.router.map((row) => row.label))}`);
  console.log(`filler ${rows.filler.length}`);
  console.log(`judge  ${rows.judge.length}: ${countLabels(rows.judge.map((row) => row.label))}`);
}

await main();
