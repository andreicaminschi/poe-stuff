/**
 * Compiles one published taxonomy version and reports the sample items no block takes.
 *
 * ```
 * yarn catalog:validate --out=<file> [--taxonomy-version=<v>] [--root=<dir>]
 * ```
 *
 * The samples come from the categories' `samples` sets, the rows are the taxonomy's drawable
 * rows, and the filter is what `catalog:compile` writes. Writes the report JSON to `--out`
 * and prints `{ version, sampled, unfiltered }` as JSON.
 */

import { writeFileSync } from "node:fs";
import { parseFilter } from "@poe/filter-eval/parse-filter";
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
  const report = findUnfiltered(parseFilter(compileFilter(rows, categories).text), rows, categories);

  writeFileSync(out, JSON.stringify(report));
  process.stdout.write(
    `${JSON.stringify({ version: published.version, sampled: report.sampled, unfiltered: report.unfiltered })}\n`,
  );
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
