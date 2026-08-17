import { parseArgs } from "../core/cli.ts";
import { run } from "../core/pipeline.ts";
import { staticPipeline } from "../pipelines/static/pipeline.ts";

await run(staticPipeline, parseArgs("static"));
