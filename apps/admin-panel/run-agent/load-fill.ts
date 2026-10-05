import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getLlama, LlamaCompletion, LlamaText, SpecialTokensText } from "node-llama-cpp";
import type { JsonSchema } from "../command-schema.ts";
import type { ToolType } from "../commands.ts";
import { listTools } from "../list-tools.ts";
import { FILL_SYSTEM } from "./prompts.ts";

const MAX_ANSWER_TOKENS = 256;

/** Writes one tool's params as JSON, or a refusal, locked to that tool's schema or to `schema` when given. */
export type FillParams = (type: ToolType, user: string, schema?: JsonSchema) => Promise<string>;

/** Loads the filler GGUF on CUDA or CPU, with one grammar per tool. Low, Sonar 1. */
export async function loadFill(runtime: string, gpu: boolean): Promise<FillParams> {
  const llama = await getLlama({ gpu: gpu
    ? "auto"
    : false });
  const model = await llama.loadModel({ modelPath: join(runtime, "fill.gguf"), gpuLayers: gpu
    ? "max"
    : 0 });
  const context = await model.createContext({ contextSize: 2048 });
  const completion = new LlamaCompletion({ contextSequence: context.getSequence() });
  const tools = listTools();
  const grammars = new Map(await Promise.all((Object.keys(tools) as ToolType[]).map(async (type) =>
    [type, await llama.createGrammarForJsonSchema(tools[type].schema as never)] as const)));
  const written = (JSON.parse(await readFile(join(runtime, "fill-prompt.json"), "utf8")) as { readonly template: string }).template;
  const bos = model.tokens.bosString;
  const template = model.tokens.shouldPrependBosToken && bos !== null && written.startsWith(bos)
    ? written.slice(bos.length)
    : written;

  return async (type, user, schema) => {
    const prompt = template.replace("{system}", () => FILL_SYSTEM).replace("{user}", () => user);
    const grammar = schema === undefined
      ? grammars.get(type)!
      : await llama.createGrammarForJsonSchema(schema as never);
    return completion.generateCompletion(LlamaText([new SpecialTokensText(prompt)]), { grammar, maxTokens: MAX_ANSWER_TOKENS, temperature: 0 });
  };
}
