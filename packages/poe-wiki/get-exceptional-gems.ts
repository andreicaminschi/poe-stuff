import { cacheKey } from "@util/core/cache-key";
import { optionalEnv } from "@util/core/env";
import { fileCache } from "@util/core/file-cache";
import { cargoQuery } from "./cargo.ts";
import type { CargoExceptionalGemRow, ExceptionalGem } from "./types.ts";
import { decodeEntities } from "./wiki-text.ts";

const HOUR_MS = 3_600_000;

/** Rows per request. The whole set is under a hundred, so this is one call and a check. */
const PAGE_SIZE = 500;

/**
 * The columns wanted. `items.class` is the display name — `Support Gem` — where
 * `items.class_id` spells it `SupportGem`.
 */
const FIELDS = [
  "items.name=name",
  "items.class=class",
  // A Cargo list field, so it arrives as an array. The singular `gem_tag` is a 500.
  "skill_gems.gem_tags=gem_tags",
  "skill_gems.skill_id=skill_id",
  "skill_gems.max_level=max_level",
  "items.drop_level=drop_level",
  "items.required_level=required_level",
  "items.is_drop_restricted=restricted",
  "skill_gems.support_gem_letter=support_gem_letter",
  "skill_gems.primary_attribute=primary_attribute",
].join(",");

/**
 * `HOLDS` is how Cargo matches one value inside a list field. `gem_tags LIKE
 * '%Exceptional%'` would also match nothing that exists but would quietly start matching
 * a future `ExceptionalFoo`.
 */
const WHERE = "skill_gems.gem_tags HOLDS 'Exceptional'";

/**
 * Ordering is not cosmetic: paging with `offset` is only stable if the server sorts the
 * same way on every request. The name decides a gem on its own.
 */
const ORDER_BY = "items.name";

/**
 * Every gem the wiki knows that carries the `Exceptional` gem tag.
 *
 * The tag is the game's, not the wiki's, and it is wider than the three gems the word
 * usually means: Enlighten, Empower and Enhance and their Awakened forms are in it, and
 * so is every Greater support, every Pact skill gem, and the rest of the level-72
 * drop-restricted supports — about fifty-five rows in total.
 *
 * GGG publishes no gem tags anywhere, so this table is the only place to read it off.
 *
 * Cargo caps a response, so this pages until a short page ends it, exactly as the other
 * queries here do. The set is far under one page today; the loop is what stops that
 * being an assumption.
 *
 * `POE_WIKI_CACHE_DIR` naming a folder is the whole switch. The hour is part of the key,
 * so an entry is only ever read back within the hour that wrote it; unset means every
 * call re-queries. The gem list moves on a patch, so an hour is generous either way.
 */
export async function getExceptionalGems(): Promise<readonly ExceptionalGem[]> {
  const root = optionalEnv("POE_WIKI_CACHE_DIR");
  const cache =
    root === undefined ? undefined : fileCache<readonly ExceptionalGem[]>(root);
  const key = cacheKey(
    "poe-wiki-exceptional-gems",
    String(Math.floor(Date.now() / HOUR_MS)),
  );

  const cached = await cache?.get(key);
  if (cached !== undefined) return cached;

  const gems: ExceptionalGem[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const rows = await cargoQuery<CargoExceptionalGemRow>({
      tables: "skill_gems,items",
      joinOn: "skill_gems._pageID=items._pageID",
      fields: FIELDS,
      where: WHERE,
      orderBy: ORDER_BY,
      offset,
      limit: PAGE_SIZE,
    });

    for (const row of rows) {
      gems.push({
        name: decodeEntities(row.name),
        itemClass: decodeEntities(row.class),
        gemTags: row.gem_tags.map(decodeEntities),
        skillId: row.skill_id,
        maxLevel: row.max_level,
        dropLevel: row.drop_level,
        requiredLevel: row.required_level,
        // Cargo sends booleans as 0 or 1.
        restrictedDrop: row.restricted === 1,
        supportGemLetter:
          row.support_gem_letter === null
            ? null
            : // A digit letter arrives as a number, and `&gt;` is a real letter.
              decodeEntities(String(row.support_gem_letter)),
        primaryAttribute: row.primary_attribute,
      });
    }

    if (rows.length < PAGE_SIZE) break;
  }

  await cache?.set(key, gems);

  return gems;
}
