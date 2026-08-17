import type { Pipeline } from "../../core/pipeline.ts";
import type { Items } from "./domain.ts";
import type { RawItems } from "./raw.ts";
import { extractItems } from "./extract.ts";
import { loadItems } from "./load.ts";
import { parseRawItems } from "./raw.ts";
import { transformItems } from "./transform.ts";

export const itemsPipeline: Pipeline<RawItems, Items> = {
  name: "items",
  bucketEnv: "S3_BUCKET_METADATA",
  extract: extractItems,
  parse: parseRawItems,
  transform: transformItems,
  load: loadItems,
};
