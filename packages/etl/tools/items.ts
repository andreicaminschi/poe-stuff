import { parseArgs } from "../core/cli.ts";
import { run } from "../core/pipeline.ts";
import { itemsPipeline } from "../pipelines/items/pipeline.ts";

await run(itemsPipeline, parseArgs("items"));
