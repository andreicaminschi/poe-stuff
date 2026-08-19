import { cacheKey } from "@util/core/cache-key";
import { optionalEnv } from "@util/core/env";
import { fileCache } from "@util/core/file-cache";
import { cargoQuery } from "./cargo.ts";
import { decodeEntities } from "./wiki-text.ts";
import type { CargoUniqueRow, WikiUniqueItem } from "./types.ts";

const HOUR_MS = 3_600_000;

/**
 * Rows per request. Cargo caps a page well above this, but four polite requests for the
 * whole set is nobody's problem and one enormous one might be.
 */
const PAGE_SIZE = 500;

/**
 * The columns wanted, in Cargo's `table.column=alias` form. `items.class` is the display
 * name — `Two-Handed Sword` — where `items.class_id` is the internal `Two Hand Sword`.
 */
const FIELDS = [
  "items.name=name",
  "items.base_item=base_type",
  "items.class=category",
  "items.is_drop_restricted=restricted_drop",
].join(",");

/**
 * Ordering is not cosmetic: paging with `offset` is only stable if the server sorts the
 * same way on every request, and name alone does not decide the uniques that share one.
 */
const ORDER_BY = "items.name,items.base_item";

/**
 * Every unique the wiki knows: its name, its base item, its item class, and whether the
 * wiki considers it drop-restricted.
 *
 * The last of those is the reason this package exists. GGG's own `/data/items` publishes
 * names and base types and nothing else — no item class finer than "Accessories", and no
 * notion of a restricted drop at all.
 *
 * Cargo caps a response, so this pages until a short page ends it. A page equal to
 * `PAGE_SIZE` is ambiguous — it may be the last — so the loop pays one extra empty
 * request rather than guessing.
 *
 * `POE_WIKI_CACHE_DIR` naming a folder is the whole switch. The hour is part of the key,
 * so an entry is only ever read back within the hour that wrote it; unset means every
 * call re-queries. The list changes on a league boundary, so an hour is generous either
 * way — it is a courtesy to the wiki, not a freshness policy.
 */
export async function getUniqueItems(): Promise<readonly WikiUniqueItem[]> {
  const root = optionalEnv("POE_WIKI_CACHE_DIR");
  const cache =
    root === undefined ? undefined : fileCache<readonly WikiUniqueItem[]>(root);
  const key = cacheKey(
    "poe-wiki-uniques",
    String(Math.floor(Date.now() / HOUR_MS)),
  );

  const cached = await cache?.get(key);
  if (cached !== undefined) return cached;

  const items: WikiUniqueItem[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const rows = await cargoQuery<CargoUniqueRow>({
      tables: "items",
      fields: FIELDS,
      where: "items.rarity_id='unique'",
      orderBy: ORDER_BY,
      offset,
      limit: PAGE_SIZE,
    });

    for (const row of rows) {
      items.push({
        name: decodeEntities(row.name),
        baseType: decodeEntities(row.base_type),
        category: decodeEntities(row.category),
        // Cargo sends booleans as 0 or 1.
        restrictedDrop: row.restricted_drop === 1,
      });
    }

    if (rows.length < PAGE_SIZE) break;
  }

  await cache?.set(key, items);

  return items;
}
