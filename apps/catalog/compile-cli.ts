/**
 * Compiles one published taxonomy version into a `.filter`, from the catalog's rows.
 *
 * ```
 * yarn catalog:compile --out=<file> [--taxonomy-version=<v>] [--root=<dir>]
 * ```
 *
 * Fetches nothing and needs no environment: the rows are the taxonomy's drawable rows, and a
 * compiled filter carries conditions only. Prints `{ version, blocks, skipped }` as JSON.
 */

import { writeFileSync } from "node:fs";
import { createTaxonomyService } from "@poe/taxonomy/service";
import { fromTaxonomy } from "./build-silver/from-taxonomy.ts";
import { compileFilter } from "./compile-filter.ts";

const flag = (args: readonly string[], name: string): string | undefined =>
  args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const out = flag(args, "out");

  if (out === undefined) {
    throw new Error("usage: compile-cli.ts --out=<file> [--taxonomy-version=<v>] [--root=<dir>]");
  }

  const taxonomy = createTaxonomyService({ root: flag(args, "root") });
  const published = await taxonomy.getTaxonomy(flag(args, "taxonomy-version"));
  const { categories } = await taxonomy.getCategories(published.version);
  const compiled = compileFilter(fromTaxonomy(published), categories);

  writeFileSync(out, compiled.text);
  process.stdout.write(
    `${JSON.stringify({ version: published.version, blocks: compiled.blocks, skipped: compiled.skipped })}\n`,
  );
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
