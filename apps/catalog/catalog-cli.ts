import { createGGGService } from "@poe/ggg/service";
import { createPoeWatchService } from "@poe/poe-watch/service";
import { createTaxonomyService } from "@poe/taxonomy/service";
import { requireEnv } from "@util/env";
import { createLakeService } from "@poe/lake/service";
import { manifestKey } from "./lake/keys.ts";
import { runPipeline, SOURCES, type Force } from "./pipeline.ts";
import { dateFromHour, hourFromDate, parseHour, previousHour, runId } from "./run-id.ts";
import type { PipelineEvent } from "./types.ts";

const flag = (args: readonly string[], name: string): string | undefined =>
  args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);

const report = (event: PipelineEvent): void => {
  if (event.type === "stage-skipped") {
    process.stdout.write(`${event.stage}: skipped, ${event.reason}\n`);
    return;
  }
  if (event.type === "step-started") {
    process.stdout.write(`${event.id}: running\n`);
    return;
  }
  const [first] = event.keys;
  const wrote =
    first === undefined
      ? ""
      : ` -> ${event.keys.length > 1 ? `${event.keys.length} files under ${first.replace(/[^/]+$/, "")}` : first}`;

  process.stdout.write(`${event.id}: ${event.rows} rows${wrote}\n`);
};

function parseSources(named: string): Force {
  const sources = named.split(",").map((source) => source.trim()).filter(Boolean);
  const unknown = sources.filter((source) => !SOURCES.includes(source));

  if (unknown.length > 0) {
    throw new Error(`Unknown source in --force: ${unknown.join(", ")}. Known: ${SOURCES.join(", ")}`);
  }

  return new Set(sources);
}

function chooseForce(args: readonly string[]): Force {
  const named = flag(args, "force");

  if (named !== undefined) return parseSources(named);
  if (args.includes("--force")) return new Set(SOURCES);

  return new Set();
}

function chooseHour(args: readonly string[]): number {
  const date = flag(args, "date");
  const hour = flag(args, "hour");

  if (date !== undefined && hour !== undefined) {
    throw new Error("Pass --date or --hour, not both");
  }
  if (date !== undefined) return hourFromDate(date);
  if (hour !== undefined) return parseHour(hour);

  return previousHour();
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const league = flag(args, "league");
  if (league === undefined) throw new Error("Pass --league=<name>");

  const force = chooseForce(args);
  const hourId = chooseHour(args);
  const id = runId(league, hourId);
  const userAgent = requireEnv("POE_USER_AGENT");
  const root = flag(args, "root");
  const lake = createLakeService({ root });
  const taxonomyVersion = flag(args, "taxonomy-version");

  process.stdout.write(`run ${id} (${dateFromHour(hourId)} UTC)\n`);

  await runPipeline(
    {
      lake,
      runId: id,
      league,
      hourId,
      ggg: createGGGService({ userAgent }),
      poeWatch: createPoeWatchService({ userAgent }),
      taxonomy: createTaxonomyService({ root }),
      ...(taxonomyVersion === undefined ? {} : { taxonomyVersion }),
    },
    { onEvent: report, force },
  );

  process.stdout.write(`manifest ${manifestKey(id)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
