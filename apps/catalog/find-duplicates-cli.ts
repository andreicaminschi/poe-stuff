/**
 * Reports the display names that more than one metadata id carries.
 *
 * ```
 * yarn duplicates --league=Allflame
 * yarn duplicates --league=Allflame --hour=1788278400
 * ```
 *
 * Reads one run's silver and writes `duplicates.json` beside its manifest. A name whose ids
 * are all listed in `find-duplicates/known-duplicates.json` is reported as known; one with
 * an id nobody has ruled on is reported as an open duplicate, with every id it carries.
 *
 * Needs no environment and makes no request.
 */

import { findDuplicates, knownDuplicates } from "./find-duplicates.ts";
import type { Item } from "./item.ts";
import { createLocalLake, DEFAULT_ROOT } from "./lake.ts";
import { manifestKey, runPrefix } from "./lake/keys.ts";
import { dateFromHour, hourFromDate, parseHour, previousHour, runId } from "./run-id.ts";
import type { Manifest } from "./types.ts";

const flag = (args: readonly string[], name: string): string | undefined =>
  args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);

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
  const lake = createLocalLake(flag(args, "root") ?? DEFAULT_ROOT);

  const manifest = await lake.readJson<Manifest>(manifestKey(id));
  const silver = manifest.stages.silver;

  if (silver === undefined) {
    throw new Error(`${id} has no silver stage. Run the catalog first.`);
  }

  // The manifest already records every key the stage wrote, so the report needs no way to
  // list the lake — it reads back exactly what silver said it produced.
  const keys = silver.steps
    .flatMap((step) => step.keys)
    .filter((key) => key.endsWith(".filterable.json"));

  const rows: Item[] = [];
  for (const key of keys) rows.push(...(await lake.readJson<Item[]>(key)));

  const report = findDuplicates(id, rows, knownDuplicates());
  const key = `${runPrefix(id)}/duplicates.json`;

  await lake.writeJson(key, report);

  process.stdout.write(
    `${id} (${dateFromHour(hourId)} UTC): ${report.duplicates.length} open, ${report.known.length} known, of ${report.names} names\n`,
  );
  process.stdout.write(`${key}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
