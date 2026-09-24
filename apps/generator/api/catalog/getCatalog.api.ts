import type { Lake } from "@poe/lake/types";
import type { CatalogRow, CategoryRecord } from "@poe/filter-style/types";
import { catalogKey, categoriesKey } from "../util/keys.ts";

/** The league's published catalog: its rows and its category table. */
export type Catalog = {
  readonly rows: readonly CatalogRow[];
  readonly categories: Readonly<Record<string, CategoryRecord>>;
};

export async function getCatalog(lake: Lake, league: string): Promise<Catalog> {
  const [rows, categories] = await Promise.all([
    lake.readJson<readonly CatalogRow[]>(catalogKey(league)),
    lake.readJson<Readonly<Record<string, CategoryRecord>>>(categoriesKey(league)),
  ]);

  return { rows, categories };
}
