import { parseArgs } from "../core/cli.ts";
import { run } from "../core/pipeline.ts";
import { statsPipeline } from "../pipelines/stats/pipeline.ts";

await run(statsPipeline, parseArgs("stats"));
