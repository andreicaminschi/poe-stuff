import { cacheKey } from "@util/core/cache-key";
import { optionalEnv } from "@util/core/env";
import { fileCache } from "@util/core/file-cache";
import { cargoQuery } from "./cargo.ts";
import type {
  CargoInfluenceModRow,
  Influence,
  InfluenceMod,
} from "./types.ts";
import { wikiText } from "./wiki-text.ts";

const HOUR_MS = 3_600_000;

/** Rows per request. The whole set is a few thousand, so this is a handful of calls. */
const PAGE_SIZE = 500;

/**
 * The game data names three of the influences after the monster that carries them, and
 * the wiki exports the internal name. Searching the tags for "redeemer", "hunter" or
 * "warlord" finds nothing at all — this table is the whole reason it finds anything.
 */
const INFLUENCE_BY_CODENAME: Record<string, Influence> = {
  shaper: "Shaper",
  elder: "Elder",
  crusader: "Crusader",
  eyrie: "Redeemer",
  basilisk: "Hunter",
  adjudicator: "Warlord",
};

const CODENAMES = Object.keys(INFLUENCE_BY_CODENAME);

const FIELDS = [
  "mods.id=id",
  "mods.name=name",
  "mods.stat_text=stat_text",
  // Declared a list field on the wiki, so it arrives as an array. Asking for the
  // singular `mods.mod_group` is a 500, not an empty result.
  "mods.mod_groups=mod_groups",
  "mods.required_level=required_level",
  "mod_spawn_weights.tag=tag",
  "mod_spawn_weights.value=weight",
].join(",");

/**
 * Narrow to the tags that could be influence tags. A suffix match is all SQL is asked
 * for; deciding what actually is one happens in `splitTag`, where an underscore means an
 * underscore. In `LIKE` it would be a single-character wildcard.
 */
const WHERE = CODENAMES.map(
  (codename) => `mod_spawn_weights.tag LIKE '%${codename}'`,
).join(" OR ");

/**
 * Ordering is not cosmetic: paging with `offset` is only stable if the server sorts the
 * same way every time, and a mod id alone does not decide the rows of one mod across
 * slots.
 */
const ORDER_BY = "mods.id,mod_spawn_weights.tag";

/**
 * `helmet_shaper` into `helmet` and `Shaper`. Undefined for anything that merely ends in
 * a codename without the underscore before it — `elder_occupied_map` is the tag this
 * exists to reject, and a bare `shaper` would be a tag with no slot at all.
 */
function splitTag(
  tag: string,
): { slot: string; influence: Influence } | undefined {
  for (const codename of CODENAMES) {
    const suffix = `_${codename}`;
    if (!tag.endsWith(suffix)) continue;

    const slot = tag.slice(0, -suffix.length);
    if (slot === "") return undefined;

    return { slot, influence: INFLUENCE_BY_CODENAME[codename] as Influence };
  }

  return undefined;
}

/**
 * Every influence modifier the wiki knows, one row per modifier per equipment slot.
 *
 * This is the join GGG's API cannot answer. `/api/trade/data/stats` lists the stats you
 * may search on and nothing else — no influence, no tier, no spawn weight, no item class
 * — so which modifiers belong to the Hunter exists only in the game files and here.
 *
 * Weight is filtered by the caller, not here. It is also never filtered in the `where`
 * clause: Cargo declares the column String, so a numeric comparison there returns zero
 * rows and no error at all.
 *
 * Cached exactly like `getUniqueItems` — `POE_WIKI_CACHE_DIR` naming a folder is the
 * whole switch, and the hour in the key is the expiry.
 */
export async function getInfluenceMods(): Promise<readonly InfluenceMod[]> {
  const root = optionalEnv("POE_WIKI_CACHE_DIR");
  const cache =
    root === undefined ? undefined : fileCache<readonly InfluenceMod[]>(root);
  const key = cacheKey(
    "poe-wiki-influence-mods",
    String(Math.floor(Date.now() / HOUR_MS)),
  );

  const cached = await cache?.get(key);
  if (cached !== undefined) return cached;

  const mods: InfluenceMod[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const rows = await cargoQuery<CargoInfluenceModRow>({
      tables: "mods,mod_spawn_weights",
      joinOn: "mods._pageID=mod_spawn_weights._pageID",
      fields: FIELDS,
      where: WHERE,
      orderBy: ORDER_BY,
      offset,
      limit: PAGE_SIZE,
    });

    for (const row of rows) {
      const split = splitTag(row.tag);
      if (split === undefined) continue;

      mods.push({
        influence: split.influence,
        equipmentSlot: split.slot,
        id: row.id,
        // Cargo sends an absent value as null, not an empty string.
        name: row.name === null ? null : wikiText(row.name),
        modifier: wikiText(row.stat_text),
        modGroups: row.mod_groups,
        requiredLevel: row.required_level,
        weight: row.weight,
      });
    }

    if (rows.length < PAGE_SIZE) break;
  }

  await cache?.set(key, mods);

  return mods;
}
