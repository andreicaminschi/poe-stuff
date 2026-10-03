import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PreTrainedTokenizer } from "@huggingface/transformers";
import * as ort from "onnxruntime-node";

const MAX_TOKENS = 384;

/** Scores yes/no questions: one probability of "yes" per text. */
export type ScoreYes = (texts: readonly string[]) => Promise<readonly number[]>;

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

/** Softmax of two logits, the "yes" side. Low, Sonar 0. */
const readYes = (no: number, yes: number): number => 1 / (1 + Math.exp(no - yes));

export type DecidePrecision = "int8" | "fp32";

/** Loads the decision model: ONNX on DirectML or CPU, and its tokenizer. Low, Sonar 1. */
export async function loadDecide(runtime: string, gpu: boolean, precision: DecidePrecision): Promise<ScoreYes> {
  const tokenizer = new PreTrainedTokenizer(
    JSON.parse(await readFile(join(runtime, "decide-tokenizer.json"), "utf8")) as object,
    JSON.parse(await readFile(join(runtime, "decide-tokenizer_config.json"), "utf8")) as object,
  );
  const session = await ort.InferenceSession.create(join(runtime, `decide-${precision}.onnx`), {
    executionProviders: gpu
      ? ["dml", "cpu"]
      : ["cpu"],
  });
  const pad = tokenizer.pad_token_id ?? 0;

  return async (texts) => {
    const rows = texts.map((text) => tokenizer.encode(text).slice(0, MAX_TOKENS));
    const { ids, mask, width } = padRows(rows, pad);
    const output = await session.run({
      input_ids: new ort.Tensor("int64", ids, [texts.length, width]),
      attention_mask: new ort.Tensor("int64", mask, [texts.length, width]),
    });
    const logits = output["logits"]?.data as Float32Array;

    return texts.map((_text, at) => readYes(logits[at * 2] ?? 0, logits[(at * 2) + 1] ?? 0));
  };
}
