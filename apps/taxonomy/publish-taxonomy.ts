import { categoriesKey, versionKey } from "./lake.ts";
import { assertPublishable, entryOf, readRegistry, writeRegistry } from "./registry.ts";
import type { Lake } from "@poe/lake/types";
import type { Version } from "./types.ts";

export async function publishTaxonomy(
  lake: Lake,
  version: string,
  table: Version,
): Promise<readonly string[]> {
  const registry = await readRegistry(lake);
  assertPublishable(registry, version);

  const keys = [categoriesKey(version), versionKey(version)] as const;

  for (const key of keys) {
    if (await lake.exists(key)) {
      throw new Error(`${key} already exists. A published version is never rewritten.`);
    }
  }

  const fold = <T extends object>(rows: Readonly<Record<string, T>>) =>
    Object.fromEntries(
      Object.entries(rows).map(([id, row]) => {
        const variants = table.variants[id];

        return [id, variants === undefined ? row : { ...row, variants }];
      }),
    );

  await lake.writeJsonAtomic(keys[0], { version, categories: table.categories });
  await lake.writeJsonAtomic(keys[1], {
    version,
    items: fold(table.items),
    authored: fold(table.authored),
  });

  await writeRegistry(lake, {
    ...registry,
    versions: {
      ...registry.versions,
      [version]: {
        ...entryOf(registry, version),
        state: "published",
        publishedAt: new Date().toISOString(),
      },
    },
  });

  return keys;
}
