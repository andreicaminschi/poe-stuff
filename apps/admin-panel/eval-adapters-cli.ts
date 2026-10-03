import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { parseArgs } from "node:util";
import { createLakeService } from "@poe/lake/service";
import { evalAdapters, samplePerPair, type CommandList } from "./eval-adapters.ts";
import type { ChooseRow, FillRow, StopRow } from "./generate-training/play-example.ts";
import { loadDecide } from "./run-agent/load-decide.ts";
import { loadFill } from "./run-agent/load-fill.ts";

const { values } = parseArgs({
  options: {
    version: { type: "string" },
    splits: { type: "string", default: "eval,unseen" },
    device: { type: "string", default: "gpu" },
    decide: { type: "string", default: "fp32" },
    "per-pair": { type: "string", default: "3" },
  },
});

const main = async (): Promise<void> => {
  if (values.version === undefined) throw new Error("Pass --version, e.g. --version=count-50.");
  const lake = createLakeService();
  const root = `training/${values.version}`;
  const runtime = resolve(".s3", "training", values.version, "output", "runtime");
  const gpu = values.device === "gpu";
  const perPair = Number(values["per-pair"]);
  const commands = await lake.readJson<CommandList>(`${root}/training-data/commands.json`);
  const models = { scoreYes: await loadDecide(runtime, gpu, values.decide === "int8" ? "int8" : "fp32"), fillParams: await loadFill(runtime, gpu), commands };

  for (const split of values.splits.split(",")) {
    const started = performance.now();
    const read = <T>(kind: string) => lake.readJson<readonly T[]>(`${root}/training-data/${split}/${kind}.json`);
    const scores = await evalAdapters(
      models,
      samplePerPair(await read<StopRow>("stop"), perPair),
      samplePerPair(await read<ChooseRow>("choose"), perPair),
      samplePerPair(await read<FillRow>("fill"), perPair),
    );
    const result = {
      version: values.version,
      split,
      device: values.device,
      decide: values.decide,
      perPair,
      seconds: Math.round((performance.now() - started) / 1000),
      peakProcessRamMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      ...scores,
    };
    await lake.writeJson(`${root}/output/eval-${split}-${values.device}-decide-${values.decide}.json`, result);
    console.log(`${values.version} ${split} ${values.device}: stop ${String(scores.stop.accuracy)}, choose ${String(scores.choose.accuracy)}, fill ${String(scores.fill.accuracy)} in ${String(result.seconds)} s`);
  }
};

await main();
process.exit(0);
