import type { Pipeline } from "../../core/pipeline.ts";
import type { Leagues } from "./domain.ts";
import type { RawLeagues } from "./raw.ts";
import { extractLeagues } from "./extract.ts";
import { loadLeagues } from "./load.ts";
import { parseRawLeagues } from "./raw.ts";
import { transformLeagues } from "./transform.ts";

export const leaguesPipeline: Pipeline<RawLeagues, Leagues> = {
  name: "leagues",
  bucketEnv: "S3_BUCKET_METADATA",
  extract: extractLeagues,
  parse: parseRawLeagues,
  transform: transformLeagues,
  load: loadLeagues,
};
