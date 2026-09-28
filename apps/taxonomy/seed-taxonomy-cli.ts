import { createRepoeService } from "@poe/repoe/service";
import { createLakeService } from "@poe/lake/service";
import { sourceKey } from "./lake.ts";
import { entryOf, highestDraft, readRegistry } from "./registry.ts";
import { readRejectedBaseTypes } from "./rejected-base-types.ts";
import { seedTaxonomy } from "./seed-taxonomy.ts";
import type { Lake } from "@poe/lake/types";
import { versionTable } from "./versions.ts";
import { flag } from "./cli-args.ts";

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

  const { items } = await versionTable(lake, version, readRejectedBaseTypes());
  const { variants, authored, counts } = await seedTaxonomy(items, createRepoeService());

  const variantsKey = sourceKey(version, "variants.seeded");
  const authoredKey = sourceKey(version, "authored.seeded");

  await lake.writeJson(variantsKey, variants);
  await lake.writeJson(authoredKey, authored);

  for (const [seed, count] of Object.entries(counts)) {
    process.stdout.write(`${seed}: ${count.variants} rows of variants, ${count.authored} authored rows\n`);
  }
  process.stdout.write(`wrote ${variantsKey}\nwrote ${authoredKey}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error
    ? error.message
    : String(error)}\n`);
  process.exitCode = 1;
});
