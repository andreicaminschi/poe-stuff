/**
 * Writes classifier eval cases off one league's published catalog.
 *
 * ```
 * yarn taxonomy:build-eval-cases --league=<league> [--root=<dir>]
 * ```
 *
 * Reads `catalog/latest/<league>.catalog.json` and its categories, and writes
 * `taxonomy/evals/<v>/cases.json`, `<v>` being the promoted taxonomy version. Prints the case
 * count and how many match nothing as JSON.
 */

import { createLakeService } from "@poe/lake/service";
import type { CategoryRecords } from "@poe/filter-compile/resolve-row";
import type { SampleCategories } from "@poe/filter-validate/types";
import { buildEvalCases, type EvalRow } from "./build-eval-cases.ts";
import { latestKey, PREFIX } from "./lake.ts";
import { flag } from "./cli-args.ts";
import { slug } from "./slug.ts";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const league = flag(args, "league");

  if (league === undefined) {
    throw new Error("usage: build-eval-cases-cli.ts --league=<league> [--root=<dir>]");
  }

  const lake = createLakeService({ root: flag(args, "root") });
  const { version } = await lake.readJson<{ readonly version: string }>(latestKey());
  const rows = await lake.readJson<readonly EvalRow[]>(`catalog/latest/${slug(league)}.catalog.json`);
  const categories = await lake.readJson<SampleCategories & CategoryRecords>(
    `catalog/latest/${slug(league)}.catalog.categories.json`,
  );

  const cases = buildEvalCases(rows, categories);
  await lake.writeJsonAtomic(`${PREFIX}/evals/${version}/cases.json`, { version, league, cases });

  const unmatched = cases.filter((one) => one.matches.length === 0).length;
  process.stdout.write(`${JSON.stringify({ version, cases: cases.length, unmatched })}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error
    ? error.message
    : String(error)}\n`);
  process.exitCode = 1;
});
