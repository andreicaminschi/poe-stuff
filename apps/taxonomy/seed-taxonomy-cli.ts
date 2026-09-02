/**
 * Seeds the variants the game's data can describe, for the version being edited.
 *
 * ```
 * yarn taxonomy:seed
 * yarn taxonomy:seed --version=3.30
 * ```
 *
 * Runs every seed and writes `versions/<version>.variants.seeded.json` and
 * `versions/<version>.authored.seeded.json` whole — the files are what the seeds say, every
 * time. A person's variants and rows live in the `.manual.json` pair and are not touched.
 * Seeding does not publish; `republish` does, and reads all four.
 *
 * Reads RePoE and nothing else, with its default user agent: RePoE accepts it, and only GGG
 * demands a named contact. Needs no environment.
 */

import { writeFileSync } from "node:fs";
import { createRepoeService } from "@poe/repoe/service";
import { createLocalLake, DEFAULT_ROOT, pointerKey } from "./lake.ts";
import { seedTaxonomy } from "./seed-taxonomy.ts";
import { versionTable } from "./versions.ts";

const flag = (args: readonly string[], name: string): string | undefined =>
  args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);

/** Whichever version is promoted. What an unnamed seed means by "the one being edited". */
async function promotedVersion(root: string): Promise<string> {
  const lake = createLocalLake(root);
  const key = pointerKey();

  if (!(await lake.exists(key))) {
    throw new Error(`Nothing is promoted (${key} does not exist). Pass --version=<v>.`);
  }

  return (await lake.readJson<{ version: string }>(key)).version;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const version =
    flag(args, "version") ?? (await promotedVersion(flag(args, "root") ?? DEFAULT_ROOT));

  const { items } = versionTable(version);
  const { variants, authored, counts } = await seedTaxonomy(items, createRepoeService());

  const files = [
    [`versions/${version}.variants.seeded.json`, variants],
    [`versions/${version}.authored.seeded.json`, authored],
  ] as const;

  for (const [file, table] of files) {
    writeFileSync(new URL(file, import.meta.url), `${JSON.stringify(table, null, 2)}\n`);
  }

  for (const [seed, count] of Object.entries(counts)) {
    process.stdout.write(
      `${seed}: ${count.variants} rows of variants, ${count.authored} authored rows\n`,
    );
  }
  for (const [file] of files) process.stdout.write(`wrote ${file}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
