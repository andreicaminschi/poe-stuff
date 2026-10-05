import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { parseArgs } from "node:util";
import { createLakeService } from "@poe/lake/service";
import { evalAdapters, samplePerPair } from "./eval-adapters.ts";
import type { EntryRow, IntentRow } from "./generate-training/rows/classify-request.ts";
import type { ChooseRow, FillRow, RowMeta, StopRow } from "./generate-training/rows/play-example.ts";
import { loadEncoder } from "./run-agent/load-encoder.ts";
import { loadFill } from "./run-agent/load-fill.ts";

const { values } = parseArgs({
  options: {
    version: { type: "string" },
    splits: { type: "string", default: "eval,unseen" },
    device: { type: "string", default: "gpu" },
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
  console.log(`Loading ${values.version} models on ${values.device}…`);
  const models = { runAdapter: await loadEncoder(runtime, gpu), fillParams: await loadFill(runtime, gpu) };

  for (const split of values.splits.split(",")) {
    const started = performance.now();
    const read = async <T extends { readonly meta: RowMeta }>(kind: string) =>
      samplePerPair(await lake.readJson<readonly T[]>(`${root}/training-data/${split}/${kind}.json`), perPair);
    const scores = await evalAdapters(`${values.version} ${split}`, models, {
      stop: await read<StopRow>("stop"),
      choose: await read<ChooseRow>("choose"),
      fill: await read<FillRow>("fill"),
      entry: await read<EntryRow>("entry"),
      intent: await read<IntentRow>("intent"),
    });
    const result = {
      version: values.version,
      split,
      device: values.device,
      perPair,
      seconds: Math.round((performance.now() - started) / 1000),
      peakProcessRamMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      ...scores,
    };
    await lake.writeJson(`${root}/output/eval-${split}-${values.device}.json`, result);
    console.log(`${values.version} ${split} ${values.device}: stop ${String(scores.stop.accuracy)}, choose ${String(scores.choose.accuracy)}, fill ${String(scores.fill.accuracy)}, entry ${String(scores.entry.accuracy)}, intent ${String(scores.intent.accuracy)} in ${String(result.seconds)} s`);
  }
};

await main();
process.exit(0);
