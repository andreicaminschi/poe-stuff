import { categoriesKey, versionKey } from "./lake.ts";
import { assertPublishable, entryOf, readRegistry, writeRegistry } from "./registry.ts";
import type { Lake } from "@poe/lake/types";
import type { Version } from "./types.ts";

export type Published = {
  readonly keys: readonly string[];
  readonly rowsLeftOut: number;
  readonly variantsLeftOut: number;
};

export async function publishTaxonomy(
  lake: Lake,
  version: string,
  table: Version,
): Promise<Published> {
  const registry = await readRegistry(lake);
  assertPublishable(registry, version);

  const keys = [categoriesKey(version), versionKey(version)] as const;

  for (const key of keys) {
    if (await lake.exists(key)) {
      throw new Error(`${key} already exists. A published version is never rewritten.`);
    }
  }

  let rowsLeftOut = 0;
  let variantsLeftOut = 0;

  const fold = <
    T extends {
      readonly listing?: unknown;
      readonly excluded?: boolean;
      readonly quest?: boolean;
      readonly unpriceable?: boolean;
    },
  >(
    rows: Readonly<Record<string, T>>,
  ) =>
    Object.fromEntries(
      Object.entries(rows).flatMap(([id, row]) => {
        const all = table.variants[id] ?? [];
        const variants = all.filter((variant) => variant.listing !== undefined);
        variantsLeftOut += all.length - variants.length;

        if (variants.length > 0) return [[id, { ...row, variants }]];
        if (row.listing !== undefined || row.excluded === true || row.quest === true || row.unpriceable === true) {
          return [[id, row]];
        }

        rowsLeftOut += 1;
        return [];
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

  return { keys, rowsLeftOut, variantsLeftOut };
}
