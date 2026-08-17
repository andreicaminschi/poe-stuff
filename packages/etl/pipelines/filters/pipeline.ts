import type { Pipeline } from "../../core/pipeline.ts";
import type { Filters } from "./domain.ts";
import type { RawFilters } from "./raw.ts";
import { extractFilters } from "./extract.ts";
import { loadFilters } from "./load.ts";
import { parseRawFilters } from "./raw.ts";
import { transformFilters } from "./transform.ts";

export const filtersPipeline: Pipeline<RawFilters, Filters> = {
  name: "filters",
  bucketEnv: "S3_BUCKET_METADATA",
  extract: extractFilters,
  parse: parseRawFilters,
  transform: transformFilters,
  load: loadFilters,
};
