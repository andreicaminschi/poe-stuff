import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { parseArgs } from "node:util";
import { createLakeService } from "@poe/lake/service";
import type { StateCommand } from "./commands.ts";
import { benchmarkRequest, readGpuMemory, spreadSample, summarize, type RequestResult } from "./benchmark-agent.ts";
import type { RequestRow } from "./generate-training/play-example.ts";
import { loadDecide } from "./run-agent/load-decide.ts";
import { loadFill } from "./run-agent/load-fill.ts";

const { values } = parseArgs({
  options: {
    version: { type: "string" },
    splits: { type: "string", default: "eval,unseen" },
    device: { type: "string", default: "gpu" },
    limit: { type: "string", default: "100000" },
    decide: { type: "string", default: "fp32" },
  },
});

const main = async (): Promise<void> => {
  if (values.version === undefined) throw new Error("Pass --version, e.g. --version=count-50.");
  const lake = createLakeService();
  const root = `training/${values.version}`;
  const runtime = resolve(".s3", "training", values.version, "output", "runtime");
  const gpu = values.device === "gpu";
  const commands = await lake.readJson<readonly StateCommand["type"][]>(`${root}/training-data/commands.json`);

  const gpuBefore = await readGpuMemory();
  const loadStarted = performance.now();
  const models = { scoreYes: await loadDecide(runtime, gpu, values.decide === "fp32"
    ? "fp32"
    : "int8"), fillParams: await loadFill(runtime, gpu), commands };
  const loadMs = Math.round(performance.now() - loadStarted);
  const gpuLoaded = await readGpuMemory();
  let peakRss = process.memoryUsage().rss;

  for (const split of values.splits.split(",")) {
    const requests = spreadSample(await lake.readJson<readonly RequestRow[]>(`${root}/training-data/${split}/request.json`), Number(values.limit));
    const results: RequestResult[] = [];
    for (const request of requests) {
      results.push(await benchmarkRequest(models, request));
      peakRss = Math.max(peakRss, process.memoryUsage().rss);
    }

    const report = {
      version: values.version,
      split,
      device: values.device,
      runtime: { decide: `onnxruntime-node, ${values.decide}`, fill: "node-llama-cpp, Q8_0 GGUF, JSON grammar" },
      loadMs,
      peakProcessRamMb: Math.round(peakRss / 1024 / 1024),
      gpuMemoryMb: gpuBefore === undefined || gpuLoaded === undefined
        ? undefined
        : gpuLoaded - gpuBefore,
      ...summarize(results, commands),
      failures: results.filter((result) => !result.pass).slice(0, 20).map((result) => ({ goal: result.goal, form: result.form, verdict: result.verdict, turns: result.run.turns.map((turn) => ({ command: turn.command, answer: turn.answer })) })),
    };
    await lake.writeJson(`${root}/output/benchmark-${split}-${values.device}-decide-${values.decide}.json`, report);
    console.log(`${values.version} ${split} ${values.device}: pass ${String(report.passRate)} over ${String(report.requests)} requests, fill p50 ${String(report.latencyMs.fill["p50"])} ms, request p50 ${String(report.latencyMs.request["p50"])} ms, RAM ${String(report.peakProcessRamMb)} MB`);
  }
};

await main();
process.exit(0);
