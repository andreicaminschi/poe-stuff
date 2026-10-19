import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PreTrainedTokenizer } from "@huggingface/transformers";
import * as ort from "onnxruntime-node";

export type ClassifierName = "router" | "judge";

export type ClassifierPrecision = "fp32" | "fp16";

export type LoadedClassifier = {
  readonly classify: (input: string) => Promise<string>;
  readonly release: () => Promise<void>;
};

type ClassifierExport = { readonly labels: readonly string[]; readonly max_len: number; readonly files: Readonly<Record<ClassifierPrecision, string>> };

const readJson = async <T>(path: string): Promise<T> => JSON.parse(await readFile(path, "utf8")) as T;

// keeps the closing [SEP]
const truncateIds = (ids: readonly number[], maxLength: number): readonly number[] =>
  (ids.length <= maxLength
    ? ids
    : [...ids.slice(0, maxLength - 1), ids.at(-1) ?? 0]);

export async function loadClassifier(exportDir: string, name: ClassifierName, precision: ClassifierPrecision): Promise<LoadedClassifier> {
  const entry = (await readJson<Readonly<Record<ClassifierName, ClassifierExport>>>(join(exportDir, "export.json")))[name];
  const tokenizer = new PreTrainedTokenizer(await readJson<object>(join(exportDir, "tokenizer.json")), await readJson<object>(join(exportDir, "tokenizer_config.json")));
  // CPU beats DirectML here
  const session = await ort.InferenceSession.create(join(exportDir, entry.files[precision]), { executionProviders: ["cpu"] });

  return {
    classify: async (input) => {
      const ids = truncateIds(tokenizer.encode(input), entry.max_len);
      const shape = [1, ids.length];
      const output = await session.run({
        input_ids: new ort.Tensor("int64", BigInt64Array.from(ids, (id) => BigInt(id)), shape),
        attention_mask: new ort.Tensor("int64", new BigInt64Array(ids.length).fill(1n), shape),
      });
      const logits = output["logits"]?.data as Float32Array;
      return entry.labels[logits.indexOf(Math.max(...logits))] ?? "";
    },
    release: () => session.release(),
  };
}
