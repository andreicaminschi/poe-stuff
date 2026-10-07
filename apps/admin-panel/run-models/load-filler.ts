import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { COMMAND_TYPES, type Command } from "@poe/panel-state/execute-command";
import { getLlama, LlamaCompletion, LlamaText, type GbnfJsonSchema, type Llama, type LlamaGrammar } from "node-llama-cpp";
import { buildFillerSchemas, type Vocabulary } from "./filler-schema.ts";

export type FillerPrecision = "f16" | "q8_0";

export type FillerBackend = "vulkan" | "cuda" | false;

export type LoadedFiller = {
  readonly fillParams: (input: string, type: Command["type"]) => Promise<string>;
  readonly release: () => Promise<void>;
};

type FillerExport = { readonly prompt: string; readonly max_new_tokens: number; readonly files: Readonly<Record<FillerPrecision, string>> };

const STOP = "\n\n\n\n";

async function createAnswerGrammar(llama: Llama, schema: GbnfJsonSchema): Promise<LlamaGrammar> {
  const json = await llama.createGrammarForJsonSchema(schema as never);
  // answers start with a space
  return llama.createGrammar({ grammar: json.grammar.replace(/^root ::= /m, "root ::= \" \"? "), stopGenerationTriggers: [LlamaText(STOP)], trimWhitespaceSuffix: true });
}

export async function loadFiller(exportDir: string, precision: FillerPrecision, backend: FillerBackend, vocabulary: Vocabulary): Promise<LoadedFiller> {
  const { filler } = JSON.parse(await readFile(join(exportDir, "export.json"), "utf8")) as { readonly filler: FillerExport };
  const llama = await getLlama({ gpu: backend });
  const model = await llama.loadModel({ modelPath: join(exportDir, filler.files[precision]), gpuLayers: backend === false
    ? 0
    : "max" });
  const context = await model.createContext({ contextSize: 1024 });
  const completion = new LlamaCompletion({ contextSequence: context.getSequence() });
  const schemas = buildFillerSchemas(vocabulary);
  const grammars = new Map(await Promise.all(COMMAND_TYPES.map(async (type) => [type, await createAnswerGrammar(llama, schemas[type])] as const)));

  return {
    fillParams: async (input, type) => (await completion.generateCompletion(filler.prompt.replace("{input}", () => input), {
      grammar: grammars.get(type),
      maxTokens: filler.max_new_tokens,
      temperature: 0,
    })).trim(),
    release: () => llama.dispose(),
  };
}
