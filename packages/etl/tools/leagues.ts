import { parseArgs } from "../core/cli.ts";
import { run } from "../core/pipeline.ts";
import { leaguesPipeline } from "../pipelines/leagues/pipeline.ts";

await run(leaguesPipeline, parseArgs("leagues"));
