import { SOURCE_FILES, sourceKey } from "./lake.ts";
import { readVersionFiles } from "./read-version-files.ts";
import { assertParentPublished, nextVersion, readRegistry, writeRegistry } from "./registry.ts";
import type { Lake } from "@poe/lake/types";

export async function createTaxonomy(lake: Lake, parent: string): Promise<string> {
  const registry = await readRegistry(lake);
  assertParentPublished(registry, parent);

  const version = nextVersion(registry, parent);
  const files = await readVersionFiles(lake, parent);

  for (const file of SOURCE_FILES) {
    await lake.writeJson(sourceKey(version, file), files[file]);
  }

  await writeRegistry(lake, {
    next: registry.next + 1,
    versions: {
      ...registry.versions,
      [version]: { state: "draft", parent, createdAt: new Date().toISOString() },
    },
  });

  return version;
}
