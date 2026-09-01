/**
 * Runs the catalog pipeline for one league and one hour.
 *
 * ```
 * node --env-file=apps/catalog/.env apps/catalog/catalog-cli.ts --league=Allflame
 * node --env-file=apps/catalog/.env apps/catalog/catalog-cli.ts --league=Allflame --date=2026-08-31-14
 * node --env-file=apps/catalog/.env apps/catalog/catalog-cli.ts --league=Allflame --hour=1788253200
 * ```
 *
 * **There is no replay flag.** A run whose bronze is already collected reuses it and
 * rebuilds silver; a run whose bronze is missing collects it first. The same command does
 * both, which is what keeps a replay from needing to be remembered as a different one.
 *
 * No cache is handed to either service. Bronze is the cache, and a second run of the same
 * hour reads the files rather than the APIs.
 */

import { createGGGService } from "@poe/ggg/service";
import { createRepoeService } from "@poe/repoe/service";
import { requireEnv } from "@util/env";
import { createLocalLake, DEFAULT_ROOT } from "./lake.ts";
import { manifestKey } from "./lake/keys.ts";
import { runPipeline } from "./pipeline.ts";
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
  // A step that wrote nothing — the validator — reports a count and no destination.
  const wrote = event.keys.length === 0 ? "" : ` -> ${event.keys.join(", ")}`;
  process.stdout.write(`${event.id}: ${event.rows} rows${wrote}\n`);
};

/**
 * Which hour to collect. `--date` and `--hour` name the same thing two ways; with neither,
 * the answer is the last hour the exchange has published, never the one now running.
 */
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

  const hourId = chooseHour(args);
  const id = runId(league, hourId);
  const userAgent = requireEnv("POE_USER_AGENT");

  process.stdout.write(`run ${id} (${dateFromHour(hourId)} UTC)\n`);

  await runPipeline(
    {
      lake: createLocalLake(flag(args, "root") ?? DEFAULT_ROOT),
      runId: id,
      league,
      hourId,
      ggg: createGGGService({ userAgent }),
      repoe: createRepoeService({ userAgent }),
    },
    { onEvent: report },
  );

  process.stdout.write(`manifest ${manifestKey(id)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
