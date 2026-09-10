import { createRepoeService } from "@poe/repoe/service";
import { createLakeService } from "@poe/lake/service";
import { sourceKey } from "./lake.ts";
import { entryOf, highestDraft, readRegistry } from "./registry.ts";
import { seedTaxonomy } from "./seed-taxonomy.ts";
import type { Lake } from "@poe/lake/types";
import type { SourceFile } from "./types.ts";
import { versionTable } from "./versions.ts";

const flag = (args: readonly string[], name: string): string | undefined =>
  args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);

async function draftVersion(lake: Lake): Promise<string> {
  const version = highestDraft(await readRegistry(lake));

  if (version === undefined) {
    throw new Error("No draft exists. Run yarn taxonomy:create --parent=<v> first.");
  }

  return version;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const lake = createLakeService({ root: flag(args, "root") });
  const version = flag(args, "version") ?? (await draftVersion(lake));

  if (entryOf(await readRegistry(lake), version).state === "published") {
    throw new Error(`${version} is published and cannot be reseeded. Create a new version.`);
  }

  const { items } = await versionTable(lake, version);
  const { variants, authored, counts } = await seedTaxonomy(items, createRepoeService());

  const files = [
    ["variants.seeded", variants],
    ["authored.seeded", authored],
  ] as const satisfies readonly (readonly [SourceFile, unknown])[];

  for (const [file, table] of files) {
    await lake.writeJson(sourceKey(version, file), table);
  }

  for (const [seed, count] of Object.entries(counts)) {
    process.stdout.write(
      `${seed}: ${count.variants} rows of variants, ${count.authored} authored rows\n`,
    );
  }
  for (const [file] of files) process.stdout.write(`wrote ${sourceKey(version, file)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
