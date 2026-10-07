import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { parseArgs } from "node:util";
import type { Command } from "@poe/panel-state/execute-command";
import type { Vocabulary } from "./run-models/filler-schema.ts";
import { loadClassifier, type ClassifierName, type ClassifierPrecision } from "./run-models/load-classifier.ts";
import { loadFiller, type FillerBackend, type FillerPrecision } from "./run-models/load-filler.ts";

const ROOT = resolve(import.meta.dirname, "../../.s3/agent-training");
const CPU_ROWS_PER_SET = 200;

type Device = "gpu-vulkan" | "gpu-cuda" | "cpu";

const FILLER_BACKENDS: Readonly<Record<Device, FillerBackend>> = { "gpu-vulkan": "vulkan", "gpu-cuda": "cuda", cpu: false };

type Row = { readonly input: string } & Readonly<Record<string, unknown>>;

type LoadedModel = { readonly predict: (row: Row) => Promise<string>; readonly release: () => Promise<void> };

type Variant = {
  readonly model: ClassifierName | "filler";
  readonly precision: ClassifierPrecision | FillerPrecision;
  readonly load: (exportDir: string, device: Device, vocabulary: Vocabulary) => Promise<LoadedModel>;
};

const readCommandType = (input: string): Command["type"] => input.match(/^command: (\w+)$/m)?.[1] as Command["type"];

const buildClassifierVariant = (model: ClassifierName, precision: ClassifierPrecision): Variant => ({
  model,
  precision,
  load: async (exportDir) => {
    const loaded = await loadClassifier(exportDir, model, precision);
    return { predict: (row) => loaded.classify(row.input), release: loaded.release };
  },
});

const buildFillerVariant = (precision: FillerPrecision): Variant => ({
  model: "filler",
  precision,
  load: async (exportDir, device, vocabulary) => {
    const loaded = await loadFiller(exportDir, precision, FILLER_BACKENDS[device], vocabulary);
    return { predict: (row) => loaded.fillParams(row.input, readCommandType(row.input)), release: loaded.release };
  },
});

const VARIANTS: readonly Variant[] = [
  buildClassifierVariant("router", "fp32"),
  buildClassifierVariant("router", "fp16"),
  buildClassifierVariant("judge", "fp32"),
  buildClassifierVariant("judge", "fp16"),
  buildFillerVariant("f16"),
  buildFillerVariant("q8_0"),
];

const readRows = (set: string, model: string): readonly Row[] =>
  readFileSync(join(ROOT, set, `${model}.jsonl`), "utf8").split("\n").filter((line) => line.trim() !== "").map((line) => JSON.parse(line) as Row);

function pickSpread<T>(rows: readonly T[], limit: number): readonly T[] {
  const picked = new Set(Array.from({ length: Math.min(limit, rows.length) }, (_, at) => Math.floor((at * rows.length) / Math.min(limit, rows.length))));
  return rows.filter((_row, at) => picked.has(at));
}

function readPercentile(sorted: readonly number[], share: number): number {
  return Math.round(sorted[Math.min(sorted.length - 1, Math.floor(share * sorted.length))] ?? 0);
}

async function predictSet(loaded: LoadedModel, rows: readonly Row[]): Promise<readonly (Row & { readonly predicted: string; readonly ms: number })[]> {
  const predictions: (Row & { readonly predicted: string; readonly ms: number })[] = [];
  for (const row of rows) {
    const started = performance.now();
    const predicted = await loaded.predict(row);
    predictions.push({ ...row, predicted, ms: performance.now() - started });
  }
  return predictions;
}

async function predictVariant(variant: Variant, run: string, device: Device, sets: readonly string[], vocabulary: Vocabulary): Promise<void> {
  const name = `${variant.model}-${variant.precision}`;
  const out = join(ROOT, "runs", run, "node", device, name);
  const loadStarted = performance.now();
  const loaded = await variant.load(join(ROOT, "runs", run, "export"), device, vocabulary);
  const loadMs = Math.round(performance.now() - loadStarted);

  const [first] = readRows(sets[0] ?? "", variant.model);
  if (first !== undefined) await loaded.predict(first);

  for (const set of sets) {
    const rows = readRows(set, variant.model);
    const predictions = await predictSet(loaded, device === "cpu"
      ? pickSpread(rows, CPU_ROWS_PER_SET)
      : rows);
    const sorted = predictions.map((row) => row.ms).sort((left, right) => left - right);
    mkdirSync(join(out, "predictions"), { recursive: true });
    writeFileSync(join(out, "predictions", `${set.replaceAll("/", "__")}.jsonl`), predictions.map((row) => JSON.stringify(row)).join("\n") + "\n");
    console.log(`${device} ${name} ${set}: ${predictions.length} rows, p50 ${readPercentile(sorted, 0.5)} ms, p95 ${readPercentile(sorted, 0.95)} ms`);
  }
  await loaded.release();
  writeFileSync(join(out, "load.json"), JSON.stringify({ loadMs }, null, 2));
  console.log(`${device} ${name}: loaded in ${loadMs} ms`);
}

async function main(): Promise<void> {
  const { values } = parseArgs({ options: {
    run: { type: "string" },
    device: { type: "string", default: "gpu-vulkan" },
    sets: { type: "string", default: "eval-5/seen,eval-5/held-out" },
  } });
  if (values.run === undefined) throw new Error("Pass --run=<folder under .s3/agent-training/runs>.");
  if (!(values.device in FILLER_BACKENDS)) throw new Error(`Pass --device as one of ${Object.keys(FILLER_BACKENDS).join(", ")}.`);

  const sets = values.sets.split(",");
  const vocabulary = JSON.parse(readFileSync(join(ROOT, sets[0] ?? "", "vocabulary.json"), "utf8")) as Vocabulary;
  for (const variant of VARIANTS) await predictVariant(variant, values.run, values.device as Device, sets, vocabulary);
}

await main();
