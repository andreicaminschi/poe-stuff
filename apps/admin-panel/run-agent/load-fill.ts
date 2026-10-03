import { join } from "node:path";
import { getLlama, LlamaCompletion, LlamaText, SpecialTokensText } from "node-llama-cpp";

const MAX_ANSWER_TOKENS = 256;

/** Writes one command's params as JSON text. */
export type FillParams = (prompt: string) => Promise<string>;

/** Loads the filler: Q8 GGUF on CUDA or CPU, output locked to JSON. Low, Sonar 1. */
export async function loadFill(runtime: string, gpu: boolean): Promise<FillParams> {
  const llama = await getLlama({ gpu: gpu
    ? "auto"
    : false });
  const model = await llama.loadModel({ modelPath: join(runtime, "fill-q8_0.gguf"), gpuLayers: gpu
    ? "max"
    : 0 });
  const context = await model.createContext({ contextSize: 2048 });
  const completion = new LlamaCompletion({ contextSequence: context.getSequence() });
  const grammar = await llama.getGrammarFor("json");

  return (prompt) => completion.generateCompletion(LlamaText([new SpecialTokensText(prompt)]), { grammar, maxTokens: MAX_ANSWER_TOKENS, temperature: 0 });
}
