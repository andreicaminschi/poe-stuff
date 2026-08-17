import type { Pipeline } from "../../core/pipeline.ts";
import type { StaticData } from "./domain.ts";
import type { RawStatic } from "./raw.ts";
import { extractStatic } from "./extract.ts";
import { loadStatic } from "./load.ts";
import { parseRawStatic } from "./raw.ts";
import { transformStatic } from "./transform.ts";

export const staticPipeline: Pipeline<RawStatic, StaticData> = {
  name: "static",
  bucketEnv: "S3_BUCKET_METADATA",
  extract: extractStatic,
  parse: parseRawStatic,
  transform: transformStatic,
  load: loadStatic,
};
