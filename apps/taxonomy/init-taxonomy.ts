import { SOURCE_FILES, sourceKey } from "./lake.ts";
import { readRegistry, versionNumber, writeRegistry } from "./registry.ts";
import type { Lake } from "@poe/lake/types";
import type { SourceFile, TaxonomyTable } from "./types.ts";

export async function initTaxonomy(lake: Lake, game: string, items: TaxonomyTable): Promise<string> {
  const registry = await readRegistry(lake);

  if (Object.keys(registry.versions).length > 0) {
    throw new Error("Versions already exist. init only starts an empty registry.");
  }

  const version = `${game}.${registry.next}`;
  versionNumber(version);

  const files: Readonly<Record<SourceFile, unknown>> = {
    items,
    categories: {},
    "authored.seeded": {},
    "authored.manual": {},
    "variants.seeded": {},
    "variants.manual": {},
  };

  for (const file of SOURCE_FILES) {
    await lake.writeJson(sourceKey(version, file), files[file]);
  }

  await writeRegistry(lake, {
    next: registry.next + 1,
    versions: { [version]: { state: "draft", createdAt: new Date().toISOString() } },
  });

  return version;
}
