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
import { findFallThrough } from "@poe/filter-validate/find-fall-through";
import { findUnfiltered } from "@poe/filter-validate/find-unfiltered";
import { createTaxonomyService } from "@poe/taxonomy/service";
import { fromTaxonomy } from "./build-silver/from-taxonomy.ts";
import { compileFilter } from "@poe/filter-compile/compile-filter";

const flag = (args: readonly string[], name: string): string | undefined =>
  args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const out = flag(args, "out");

  if (out === undefined) {
    throw new Error("usage: validate-cli.ts --out=<file> [--taxonomy-version=<v>] [--root=<dir>]");
  }

  const taxonomy = createTaxonomyService({ root: flag(args, "root") });
  const published = await taxonomy.getTaxonomy(flag(args, "taxonomy-version"));
  const { categories } = await taxonomy.getCategories(published.version);
  const rows = fromTaxonomy(published);
  const blocks = parseFilter(compileFilter(rows, categories).text);

  const unfiltered = findUnfiltered(blocks, rows, categories);
  const fallThrough = findFallThrough(blocks, rows, categories);

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
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
