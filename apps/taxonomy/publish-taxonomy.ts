import { categoriesKey, versionKey } from "./lake.ts";
import { assertPublishable, entryOf, readRegistry, writeRegistry } from "./registry.ts";
import type { Lake } from "@poe/lake/types";
import type { Version } from "./types.ts";

export type Published = {
  readonly keys: readonly string[];
  readonly rowsLeftOut: number;
  readonly variantsLeftOut: number;
};

type Publishable = {
  readonly listing?: unknown;
  readonly excluded?: boolean;
  readonly quest?: boolean;
  readonly unpriceable?: boolean;
};

type Folded<T> = {
  readonly rows: Readonly<Record<string, T>>;
  readonly rowsLeftOut: number;
  readonly variantsLeftOut: number;
};

/** A variant is published only when something prices it or it is flagged unpriceable. */
const isPriced = (variant: { readonly listing?: unknown; readonly unpriceable?: boolean }): boolean =>
  variant.listing !== undefined || variant.unpriceable === true;

/** A row with no priced variant is published only when it says what to do with it. */
const isDecided = (row: Publishable): boolean =>
  row.listing !== undefined || row.excluded === true || row.quest === true || row.unpriceable === true;

/** The rows that get published, each with its priced variants, and how many were left out. */
function foldRows<T extends Publishable>(rows: Readonly<Record<string, T>>, table: Version): Folded<T> {
  const kept: [string, T][] = [];
  let rowsLeftOut = 0;
  let variantsLeftOut = 0;

  for (const [id, row] of Object.entries(rows)) {
    const all = table.variants[id] ?? [];
    const variants = all.filter(isPriced);
    variantsLeftOut += all.length - variants.length;

    if (variants.length > 0) kept.push([id, { ...row, variants }]);
    else if (isDecided(row)) kept.push([id, row]);
    else rowsLeftOut += 1;
  }

  return { rows: Object.fromEntries(kept), rowsLeftOut, variantsLeftOut };
}

export async function publishTaxonomy(lake: Lake, version: string, table: Version): Promise<Published> {
  const registry = await readRegistry(lake);
  assertPublishable(registry, version);

  // Draft registry: leftovers, overwrite.
  const categoriesFile = categoriesKey(version);
  const versionFile = versionKey(version);

  const items = foldRows(table.items, table);
  const authored = foldRows(table.authored, table);

  await lake.writeJsonAtomic(categoriesFile, { version, categories: table.categories });
  await lake.writeJsonAtomic(versionFile, { version, items: items.rows, authored: authored.rows });

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

  return {
    keys: [categoriesFile, versionFile],
    rowsLeftOut: items.rowsLeftOut + authored.rowsLeftOut,
    variantsLeftOut: items.variantsLeftOut + authored.variantsLeftOut,
  };
}
