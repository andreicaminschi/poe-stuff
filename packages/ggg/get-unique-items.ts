import { cacheKey } from "@util/core/cache-key";
import { optionalEnv } from "@util/core/env";
import { fileCache } from "@util/core/file-cache";
import { call } from "./call.ts";
import { tradeApiUrl } from "./config.ts";
import type { GggContext, TradeItemsResponse, UniqueItem } from "./types.ts";

const HOUR_MS = 3_600_000;

/**
 * Every unique the trade site will search on, from `GET /data/items` — its name and its
 * base item, and nothing else. The endpoint returns every item GGG knows, grouped into
 * broad buckets; `flags.unique` is the only thing separating a unique from its base, and
 * an entry without a `name` is a base rather than a unique.
 *
 * This is `pathofexile.com`, so it goes through the limiter like every other trade call.
 * It is also a third of a megabyte that changes once a league, which is what the cache is
 * for: the hour is part of the key, so an entry is only ever read back within the hour
 * that wrote it, and a stale list quietly correcting itself an hour later is the whole
 * expiry policy. `CACHE_DIR` naming a folder is the switch — unset means every call goes
 * to GGG, which is what production wants.
 *
 * The `cache` on the context is deliberately not forwarded to `call`. That one keys on
 * the request and never expires, so it would pin this list for the life of the folder.
 *
 * The body is asserted, not validated: callers that care hand the result to a schema.
 */
export async function getUniqueItems({
  limiter,
  onEvent,
}: GggContext): Promise<readonly UniqueItem[]> {
  const root = optionalEnv("CACHE_DIR");
  const cache =
    root === undefined ? undefined : fileCache<readonly UniqueItem[]>(root);
  const key = cacheKey("trade-items", String(Math.floor(Date.now() / HOUR_MS)));

  const cached = await cache?.get(key);
  if (cached !== undefined) return cached;

  const body = await call<TradeItemsResponse>(`${tradeApiUrl()}/data/items`, {
    limiter,
    onEvent,
  });

  // flatMap rather than filter-then-map: returning [] for a miss is what narrows
  // `name` away from `string | undefined` without an assertion.
  const uniques = body.result.flatMap((group) =>
    group.entries.flatMap(({ name, type, flags }) =>
      flags?.unique === true && name !== undefined ? [{ name, type }] : [],
    ),
  );

  await cache?.set(key, uniques);

  return uniques;
}
