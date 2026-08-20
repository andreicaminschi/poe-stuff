import { cacheKey } from "@util/core/cache-key";
import { optionalEnv } from "@util/core/env";
import { fileCache } from "@util/core/file-cache";
import { cargoQuery } from "./cargo.ts";
import type { CargoTransfiguredGemRow, TransfiguredGem } from "./types.ts";
import { decodeEntities } from "./wiki-text.ts";

const HOUR_MS = 3_600_000;

/** Rows per request. The whole set is a couple of hundred, so this is one call and a check. */
const PAGE_SIZE = 500;

/** The columns wanted. `base_item` is the answer; the name is what it is asked about. */
const FIELDS = ["items.name=name", "items.base_item=base_item"].join(",");

/**
 * `tags HOLDS 'gem'` narrows to gems — `HOLDS` is how Cargo matches one value inside a
 * list field — and `base_item IS NOT NULL` is the transfigured test itself.
 */
const WHERE = "items.tags HOLDS 'gem' AND items.base_item IS NOT NULL";

/**
 * Ordering is not cosmetic: paging with `offset` is only stable if the server sorts the
 * same way on every request. The name decides a gem on its own.
 */
const ORDER_BY = "items.name";

/**
 * Every transfigured gem the wiki knows — the alternate skill gems a Divine Font cuts.
 *
 * There is no flag to read. `skill_gems` has no transfigured column, and the gem tags say
 * nothing either: `Ethereal Knives of the Massacre` carries the same `Spell, Projectile,
 * Physical` its base does. What separates them is `items.base_item`, which points back at
 * the gem the transfiguration was cut from and is null on everything else in the game.
 *
 * The name is not a test. 214 transfigured gems are spelled `X of Y`, and so are Herald
 * of Ash, Wave of Conviction, Purity of Fire and 24 others that are ordinary base gems.
 *
 * `POE_WIKI_CACHE_DIR` naming a folder is the whole switch. The hour is part of the key,
 * so an entry is only ever read back within the hour that wrote it; unset means every
 * call re-queries. The list moves on a patch, so an hour is generous either way.
 */
export async function getTransfiguredGems(): Promise<
  readonly TransfiguredGem[]
> {
  const root = optionalEnv("POE_WIKI_CACHE_DIR");
  const cache =
    root === undefined ? undefined : fileCache<readonly TransfiguredGem[]>(root);
  const key = cacheKey(
    "poe-wiki-transfigured-gems",
    String(Math.floor(Date.now() / HOUR_MS)),
  );

  const cached = await cache?.get(key);
  if (cached !== undefined) return cached;

  const gems: TransfiguredGem[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const rows = await cargoQuery<CargoTransfiguredGemRow>({
      tables: "items",
      fields: FIELDS,
      where: WHERE,
      orderBy: ORDER_BY,
      offset,
      limit: PAGE_SIZE,
    });

    for (const row of rows) {
      gems.push({
        name: decodeEntities(row.name),
        baseItem: decodeEntities(row.base_item),
      });
    }

    if (rows.length < PAGE_SIZE) break;
  }

  await cache?.set(key, gems);

  return gems;
}
