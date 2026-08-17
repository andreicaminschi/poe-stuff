import type { Pipeline } from "../../core/pipeline.ts";
import type { Stats } from "./domain.ts";
import type { RawStats } from "./raw.ts";
import { extractStats } from "./extract.ts";
import { loadStats } from "./load.ts";
import { parseRawStats } from "./raw.ts";
import { transformStats } from "./transform.ts";

export const statsPipeline: Pipeline<RawStats, Stats> = {
  name: "stats",
  bucketEnv: "S3_BUCKET_METADATA",
  extract: extractStats,
  parse: parseRawStats,
  transform: transformStats,
  load: loadStats,
};
