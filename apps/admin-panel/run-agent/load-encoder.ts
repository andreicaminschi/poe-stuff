import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PreTrainedTokenizer } from "@huggingface/transformers";
import * as ort from "onnxruntime-node";

const MAX_TOKENS = 384;

export type AdapterName = "stop" | "choose" | "entry" | "intent";

/** Per head: its labels, and per text one probability per label. */
export type HeadScores = Readonly<Record<string, { readonly labels: readonly string[]; readonly scores: readonly (readonly number[])[] }>>;

/** Runs one adapter on the shared encoder. */
export type RunAdapter = (adapter: AdapterName, texts: readonly string[]) => Promise<HeadScores>;

type Head = { readonly labels: readonly string[]; readonly weight: Float32Array; readonly bias: Float32Array };

type Adapter = { readonly feeds: Readonly<Record<string, ort.Tensor>>; readonly heads: Readonly<Record<string, Head>> };

type SafeTensor = { readonly dtype: string; readonly shape: readonly number[]; readonly data_offsets: readonly [number, number] };

/** Reads a safetensors file of fp32 tensors. Low, Sonar 1. */
async function readSafetensors(path: string): Promise<ReadonlyMap<string, { readonly shape: readonly number[]; readonly data: Float32Array }>> {
  const bytes = await readFile(path);
  const headerLength = Number(bytes.readBigUInt64LE(0));
  const header = JSON.parse(bytes.subarray(8, 8 + headerLength).toString("utf8")) as Readonly<Record<string, SafeTensor>>;
  const start = 8 + headerLength;

  return new Map(Object.entries(header).filter(([name]) => name !== "__metadata__").map(([name, tensor]) => {
    const [from, to] = tensor.data_offsets;
    const data = new Float32Array(bytes.buffer.slice(bytes.byteOffset + start + from, bytes.byteOffset + start + to));
    return [name, { shape: tensor.shape, data }];
  }));
}

/** Loads one adapter: its LoRA weights as encoder inputs, and its heads. Low, Sonar 2. */
async function loadAdapter(runtime: string, adapter: AdapterName, layers: readonly string[]): Promise<Adapter> {
  const tensors = await readSafetensors(join(runtime, `${adapter}.safetensors`));
  const meta = JSON.parse(await readFile(join(runtime, `${adapter}.json`), "utf8")) as { readonly heads: Readonly<Record<string, readonly string[]>> };
  const pick = (name: string) => {
    const tensor = tensors.get(name);
    if (tensor === undefined) throw new Error(`${adapter}.safetensors has no ${name}.`);
    return tensor;
  };
  const feeds = Object.fromEntries(layers.flatMap((layer) => (["A", "B"] as const).map((side) => {
    const { shape, data } = pick(`lora.${layer}.${side}`);
    return [`${side}:${layer}`, new ort.Tensor("float32", data, [...shape])];
  })));
  const heads = Object.fromEntries(Object.entries(meta.heads).map(([name, labels]) => [name, { labels, weight: pick(`head.${name}.weight`).data, bias: pick(`head.${name}.bias`).data }]));

  return { feeds, heads };
}

/** Pads token ids to the longest row. Low, Sonar 0. */
function padRows(rows: readonly (readonly number[])[], pad: number): { readonly ids: BigInt64Array; readonly mask: BigInt64Array; readonly width: number } {
  const width = Math.max(...rows.map((row) => row.length));
  const ids = new BigInt64Array(rows.length * width).fill(BigInt(pad));
  const mask = new BigInt64Array(rows.length * width);

  rows.forEach((row, at) => row.forEach((id, column) => {
    ids[(at * width) + column] = BigInt(id);
    mask[(at * width) + column] = 1n;
  }));
  return { ids, mask, width };
}

/** One linear head plus softmax over one pooled vector. Low, Sonar 1. */
function scoreHead(head: Head, pooled: Float32Array, offset: number, hidden: number): readonly number[] {
  const logits = head.labels.map((_label, row) => {
    let sum = head.bias[row] ?? 0;
    for (let at = 0; at < hidden; at += 1) sum += (head.weight[(row * hidden) + at] ?? 0) * (pooled[offset + at] ?? 0);
    return sum;
  });
  const top = Math.max(...logits);
  const exps = logits.map((logit) => Math.exp(logit - top));
  const total = exps.reduce((sum, value) => sum + value, 0);
  return exps.map((value) => value / total);
}

/** Loads the encoder once, on DirectML or CPU, and every adapter beside it. Low, Sonar 1. */
export async function loadEncoder(runtime: string, gpu: boolean): Promise<RunAdapter> {
  const tokenizer = new PreTrainedTokenizer(
    JSON.parse(await readFile(join(runtime, "encoder-tokenizer.json"), "utf8")) as object,
    JSON.parse(await readFile(join(runtime, "encoder-tokenizer_config.json"), "utf8")) as object,
  );
  const { layers } = JSON.parse(await readFile(join(runtime, "encoder-base.json"), "utf8")) as { readonly layers: readonly string[] };
  const session = await ort.InferenceSession.create(join(runtime, "encoder-base.onnx"), {
    executionProviders: gpu
      ? ["dml", "cpu"]
      : ["cpu"],
  });
  const names: readonly AdapterName[] = ["stop", "choose", "entry", "intent"];
  const adapters = new Map(await Promise.all(names.map(async (name) => [name, await loadAdapter(runtime, name, layers)] as const)));
  const pad = tokenizer.pad_token_id ?? 0;

  return async (name, texts) => {
    const adapter = adapters.get(name)!;
    const { ids, mask, width } = padRows(texts.map((text) => tokenizer.encode(text).slice(0, MAX_TOKENS)), pad);
    const output = await session.run({
      ...adapter.feeds,
      input_ids: new ort.Tensor("int64", ids, [texts.length, width]),
      attention_mask: new ort.Tensor("int64", mask, [texts.length, width]),
    });
    const pooled = output["pooled"]?.data as Float32Array;
    const hidden = pooled.length / texts.length;

    return Object.fromEntries(Object.entries(adapter.heads).map(([head, weights]) => [head, {
      labels: weights.labels,
      scores: texts.map((_text, at) => scoreHead(weights, pooled, at * hidden, hidden)),
    }]));
  };
}

/** One text's probability per label of one head. Low, Sonar 1. */
export function readHead(scores: HeadScores, head: string, at = 0): ReadonlyMap<string, number> {
  const found = scores[head];
  if (found === undefined) throw new Error(`No ${head} head.`);
  return new Map(found.labels.map((label, index) => [label, found.scores[at]?.[index] ?? 0]));
}

/** The label with the highest probability. Low, Sonar 0. */
export const topLabel = (probabilities: ReadonlyMap<string, number>): string =>
  [...probabilities].reduce((best, entry) => (entry[1] > best[1]
    ? entry
    : best), ["", -1])[0];
