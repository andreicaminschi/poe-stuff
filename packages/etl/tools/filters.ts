import { parseArgs } from "../core/cli.ts";
import { run } from "../core/pipeline.ts";
import { filtersPipeline } from "../pipelines/filters/pipeline.ts";

await run(filtersPipeline, parseArgs("filters"));
