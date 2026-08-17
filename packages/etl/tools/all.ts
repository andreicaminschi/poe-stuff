import { parseArgs } from "../core/cli.ts";
import { run } from "../core/pipeline.ts";
import { filtersPipeline } from "../pipelines/filters/pipeline.ts";
import { itemsPipeline } from "../pipelines/items/pipeline.ts";
import { leaguesPipeline } from "../pipelines/leagues/pipeline.ts";
import { staticPipeline } from "../pipelines/static/pipeline.ts";
import { statsPipeline } from "../pipelines/stats/pipeline.ts";

const options = parseArgs("all");

// Listed out rather than looped: each pipeline has its own Raw/Domain pair, and
// erasing those to put them in one array costs more than five lines. Sequential
// on purpose too — GGG rate-limits per account, so parallel extracts just back off.
await run(statsPipeline, options);
await run(itemsPipeline, options);
await run(staticPipeline, options);
await run(filtersPipeline, options);
await run(leaguesPipeline, options);
