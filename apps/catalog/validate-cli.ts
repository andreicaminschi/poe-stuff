/**
 * Compiles one published taxonomy version and reports the sample items no block takes, or
 * that a row other than their own takes or also matches.
 *
 * ```
 * yarn catalog:validate --out=<file> [--taxonomy-version=<v>] [--root=<dir>]
 * ```
 *
 * The samples come from the categories' `samples` sets, the rows are the taxonomy's drawable
 * rows, and the filter is what `catalog:compile` writes. Writes the unfiltered report to
 * `--out`, with the fall-through report under `fallThrough`, and prints the counts as JSON.
 */

import { writeFileSync } from "node:fs";
import { parseFilter } from "@poe/filter-eval/parse-filter";
import { checkFilter } from "@poe/filter-validate/check-filter";
import { createTaxonomyService } from "@poe/taxonomy/service";
import { fromTaxonomy } from "./build-silver/from-taxonomy.ts";
import { writeUnstyledFilter } from "@poe/filter-compile/write-unstyled-filter";
import { flag } from "./cli-args.ts";

const STEPS = ["Reading taxonomy", "Compiling filter", "Checking samples", "Writing report"];

const progress = (step: number): void => {
  process.stderr.write(`progress ${step}/${STEPS.length} ${STEPS[step - 1]}\n`);
};

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const out = flag(args, "out");

  if (out === undefined) {
    throw new Error("usage: validate-cli.ts --out=<file> [--taxonomy-version=<v>] [--root=<dir>]");
  }

  progress(1);
  const taxonomy = createTaxonomyService({ root: flag(args, "root") });
  const published = await taxonomy.getTaxonomy(flag(args, "taxonomy-version"));
  const { categories } = await taxonomy.getCategories(published.version);
  const rows = fromTaxonomy(published);
  progress(2);
  const blocks = parseFilter(writeUnstyledFilter(rows, categories).text);

  progress(3);
  const { unfiltered, fallThrough } = checkFilter(blocks, rows, categories);

  progress(4);
  writeFileSync(out, JSON.stringify({ ...unfiltered, fallThrough }));
  process.stdout.write(
    `${JSON.stringify({
      version: published.version,
      sampled: unfiltered.sampled,
      unfiltered: unfiltered.unfiltered,
      ownMiss: fallThrough.ownMiss.length,
      fallThrough: fallThrough.fallThrough.length,
      overlap: fallThrough.overlap.length,
      rejected: fallThrough.rejected.length,
      blind: fallThrough.blind.length,
    })}\n`,
  );
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error
    ? error.message
    : String(error)}\n`);
  process.exitCode = 1;
});
