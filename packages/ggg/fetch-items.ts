import { cacheKey } from "@util/core/cache-key";
import { optionalEnv } from "@util/core/env";
import { fileCache } from "@util/core/file-cache";
import { call } from "./call.ts";
import { tradeApiUrl } from "./config.ts";
import type { GggContext, TradeItemsResponse } from "./types.ts";

const HOUR_MS = 3_600_000;

/** Every group `GET /data/items` returns, still grouped as it arrived. */
export type ItemGroups = TradeItemsResponse["result"];

/**
 * `GET /data/items` in full: every item the trade site will search on, uniques and bases
 * together, in the broad groups the endpoint sends. Nothing is dropped here.
 * `getUniqueItems` and `getItemBases` each reduce this to the half they care about, and
 * they share one download because there is one endpoint behind both.
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
export async function fetchItems({
  limiter,
  onEvent,
}: GggContext): Promise<ItemGroups> {
  const root = optionalEnv("CACHE_DIR");
  const cache = root === undefined ? undefined : fileCache<ItemGroups>(root);
  // Namespaced `data-items` rather than `trade-items`: that name belonged to the reduced
  // unique list this file replaced, and an entry it wrote is a different shape.
  const key = cacheKey("data-items", String(Math.floor(Date.now() / HOUR_MS)));

  const cached = await cache?.get(key);
  if (cached !== undefined) return cached;

  const body = await call<TradeItemsResponse>(`${tradeApiUrl()}/data/items`, {
    limiter,
    onEvent,
  });

  await cache?.set(key, body.result);

  return body.result;
}
