import { parseArgs } from "node:util";
import { createLakeService } from "@poe/lake/service";
import { ACTIONS, COMMAND_PARTS, TARGETS } from "./command-parts.ts";
import { generateTraining, TRAINED_COMMANDS, type TrainingRows } from "./generate-training.ts";
import { listTools } from "./list-tools.ts";

const { values } = parseArgs({
  options: {
    version: { type: "string" },
    count: { type: "string", default: "200" },
    "eval-count": { type: "string" },
    "train-seed": { type: "string", default: "1" },
    "eval-seed": { type: "string", default: "2" },
    "unseen-only": { type: "boolean", default: false },
    "unseen-seed": { type: "string", default: "3" },
  },
});

const main = async (): Promise<void> => {
  const count = Number(values.count);
  const version = values.version ?? `count-${String(count)}`;
  const evalCount = Number(values["eval-count"] ?? values.count);
  const lake = createLakeService();
  const root = `training/${version}/training-data`;
  const splits: Readonly<Record<string, TrainingRows>> = values["unseen-only"]
    ? { unseen: generateTraining(Number(values["unseen-seed"]), evalCount, "unseen") }
    : { train: generateTraining(Number(values["train-seed"]), count), eval: generateTraining(Number(values["eval-seed"]), evalCount) };

  if (!values["unseen-only"]) {
    await lake.writeJson(`${root}/commands.json`, TRAINED_COMMANDS);
    await lake.writeJson(`${root}/command-parts.json`, { actions: ACTIONS, targets: TARGETS, parts: COMMAND_PARTS });
    await lake.writeJson(`${root}/tools.json`, listTools());
  }
  for (const [split, rows] of Object.entries(splits)) {
    for (const [kind, list] of Object.entries(rows)) await lake.writeJson(`${root}/${split}/${kind}.json`, list);
    console.log(`${version} ${split}: ${String(rows.stop.length)} stop, ${String(rows.choose.length)} choose, ${String(rows.fill.length)} fill, ${String(rows.entry.length)} entry, ${String(rows.intent.length)} intent rows`);
  }
};

await main();
