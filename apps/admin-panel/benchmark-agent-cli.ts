import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { parseArgs } from "node:util";
import { createLakeService } from "@poe/lake/service";
import { benchmarkRequest, readGpuMemory, spreadSample, summarize, type RequestResult } from "./benchmark-agent.ts";
import type { RequestRow } from "./generate-training/rows/play-example.ts";
import { loadEncoder } from "./run-agent/load-encoder.ts";
import { startProgress } from "./progress-line.ts";
import { loadFill } from "./run-agent/load-fill.ts";

const { values } = parseArgs({
  options: {
    version: { type: "string" },
    splits: { type: "string", default: "eval,unseen" },
    device: { type: "string", default: "gpu" },
    limit: { type: "string", default: "100000" },
    "fill-from": { type: "string" },
  },
});

const main = async (): Promise<void> => {
  if (values.version === undefined) throw new Error("Pass --version, e.g. --version=count-50.");
  const lake = createLakeService();
  const root = `training/${values.version}`;
  const runtime = resolve(".s3", "training", values.version, "output", "runtime");
  const gpu = values.device === "gpu";
  const fillFrom = values["fill-from"] ?? values.version;
  const suffix = fillFrom === values.version
    ? ""
    : `-fill-${fillFrom}`;

  const gpuBefore = await readGpuMemory();
  const loadStarted = performance.now();
  console.log(`Loading ${values.version} models on ${values.device}…`);
  const models = { runAdapter: await loadEncoder(runtime, gpu), fillParams: await loadFill(resolve(".s3", "training", fillFrom, "output", "runtime"), gpu) };
  const loadMs = Math.round(performance.now() - loadStarted);
  const gpuLoaded = await readGpuMemory();
  let peakRss = process.memoryUsage().rss;

  for (const split of values.splits.split(",")) {
    const requests = spreadSample(await lake.readJson<readonly RequestRow[]>(`${root}/training-data/${split}/request.json`), Number(values.limit));
    const results: RequestResult[] = [];
    const requestDone = startProgress(`${values.version} ${split} ${values.device} requests`, requests.length);
    for (const request of requests) {
      results.push(await benchmarkRequest(models, request));
      peakRss = Math.max(peakRss, process.memoryUsage().rss);
      requestDone();
    }

    const report = {
      version: values.version,
      fillFrom,
      split,
      device: values.device,
      runtime: { encoder: "onnxruntime-node, one base + LoRA inputs", fill: "node-llama-cpp, tool schema grammars" },
      loadMs,
      peakProcessRamMb: Math.round(peakRss / 1024 / 1024),
      gpuMemoryMb: gpuBefore === undefined || gpuLoaded === undefined
        ? undefined
        : gpuLoaded - gpuBefore,
      ...summarize(results),
      failures: results.filter((result) => !result.pass).slice(0, 20).map((result) => ({ goal: result.goal, form: result.form, verdict: result.verdict, turns: result.run.turns.map((turn) => ({ command: turn.command, answer: turn.answer })) })),
    };
    await lake.writeJson(`${root}/output/benchmark-${split}-${values.device}${suffix}.json`, report);
    console.log(`${values.version} ${split} ${values.device}: pass ${String(report.passRate)} over ${String(report.requests)} requests, fill p50 ${String(report.latencyMs.fill["p50"])} ms, request p50 ${String(report.latencyMs.request["p50"])} ms, RAM ${String(report.peakProcessRamMb)} MB`);
  }
};

await main();
process.exit(0);
