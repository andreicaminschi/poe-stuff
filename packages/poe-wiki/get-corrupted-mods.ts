import { cacheKey } from "@util/core/cache-key";
import { optionalEnv } from "@util/core/env";
import { fileCache } from "@util/core/file-cache";
import { cargoQuery } from "./cargo.ts";
import type { CargoCorruptedModRow, CorruptedMod } from "./types.ts";
import { wikiText } from "./wiki-text.ts";

const HOUR_MS = 3_600_000;

/** Rows per request. The whole set is under a thousand, so this is two calls. */
const PAGE_SIZE = 500;

/**
 * The game's generation type for a corrupted modifier. The wiki exports the number, not
 * a name, and this is the only one of the thirty-odd values this package asks for.
 */
const CORRUPTED = 5;

const FIELDS = [
  "mods.id=id",
  "mods.stat_text=stat_text",
  // A Cargo list field. The singular `mods.mod_group` answers HTTP 500.
  "mods.mod_groups=mod_groups",
  "mods.required_level=required_level",
  "mods.domain=domain",
  "mod_spawn_weights.tag=tag",
  "mod_spawn_weights.value=weight",
].join(",");

/**
 * Stable ordering, which paging with `offset` depends on: the server has to sort the
 * same way on every request, and a mod id alone does not decide the rows of one mod
 * across item classes.
 */
const ORDER_BY = "mods.id,mod_spawn_weights.tag";

/**
 * Every corrupted modifier the wiki knows, one row per modifier per item class, with the
 * weight it is drawn at.
 *
 * This is the pool a Vaal Orb picks an implicit from. It is not the odds of the orb
 * picking one at all — whether an item is left alone, rerolled rare, given an implicit
 * or given white sockets is not in any Cargo table, and building that split is a model
 * of the game rather than a reading of this one.
 *
 * Cargo left-joins, so a modifier with no spawn weight anywhere arrives with a null tag.
 * Seventeen do. They are dropped: a modifier weighted nowhere is not a weighted outcome,
 * which is the whole subject here.
 *
 * Cached like the rest of this package — `POE_WIKI_CACHE_DIR` naming a folder is the
 * switch, and the hour in the key is the expiry.
 */
export async function getCorruptedMods(): Promise<readonly CorruptedMod[]> {
  const root = optionalEnv("POE_WIKI_CACHE_DIR");
  const cache =
    root === undefined ? undefined : fileCache<readonly CorruptedMod[]>(root);
  const key = cacheKey(
    "poe-wiki-corrupted-mods",
    String(Math.floor(Date.now() / HOUR_MS)),
  );

  const cached = await cache?.get(key);
  if (cached !== undefined) return cached;

  const mods: CorruptedMod[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const rows = await cargoQuery<CargoCorruptedModRow>({
      tables: "mods,mod_spawn_weights",
      joinOn: "mods._pageID=mod_spawn_weights._pageID",
      fields: FIELDS,
      where: `mods.generation_type=${CORRUPTED}`,
      orderBy: ORDER_BY,
      offset,
      limit: PAGE_SIZE,
    });

    for (const row of rows) {
      if (row.tag === null || row.weight === null) continue;

      mods.push({
        id: row.id,
        modifier: row.stat_text === null ? null : wikiText(row.stat_text),
        itemClass: row.tag,
        weight: row.weight,
        requiredLevel: row.required_level,
        modGroups: row.mod_groups,
        domain: row.domain,
      });
    }

    if (rows.length < PAGE_SIZE) break;
  }

  await cache?.set(key, mods);

  return mods;
}
