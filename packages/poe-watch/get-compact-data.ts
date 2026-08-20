import { cacheKey } from "@util/core/cache-key";
import { optionalEnv, requireEnv } from "@util/core/env";
import { fileCache } from "@util/core/file-cache";
import type { CompactResponse, ItemData } from "./types.ts";

const HOUR_MS = 3_600_000;

/** Base of the PoeWatch API. The trailing slash is stripped so joins stay predictable. */
const apiUrl = () => requireEnv("POE_WATCH_BASE_URL").replace(/\/$/, "");

/**
 * Every priced item in one league, from `GET /compact`.
 *
 * **`all=true` is not optional here, whatever the parameter is called.** Without it
 * PoeWatch answers with 13,195 rows and not one crafting base; with it, 33,144 rows, of
 * which 19,856 are the bases — and the cluster jewels, abyss jewels, talismans and
 * tinctures filed under them. The documented meaning is "all items" against "only items
 * with current data", but the bases it withholds have current data by any test: Large
 * Cluster Jewel comes back on 9,923 daily listings either way, and `GET /get` with
 * `category=bases` returns the same rows the bare call omits. So the narrow call is not a
 * freshness filter, it is a smaller answer, and every white base in the game hangs on the
 * difference. `"all"` is in the cache key for the same reason: an entry written by the
 * narrow call must never be read back as if it were this one.
 *
 * PoeWatch publishes no rate limits and this is one request for the whole league, so it
 * goes out unpaced — nothing here draws on the GGG budget that `@poe/ggg` protects. It
 * is still tens of megabytes, which is what the cache is for: the hour is part of the
 * key, so an entry is only ever read back within the hour that wrote it. PoeWatch
 * recomputes on the hour, so nothing older is worth keeping.
 *
 * `POE_WATCH_CACHE_DIR` naming a folder is the whole switch — unset means every call
 * goes to PoeWatch.
 *
 * The envelope carries nothing but `items`, so the array is what comes back. The body is
 * asserted, not validated: callers that care hand the result to a schema.
 */
export async function getCompactData(
  league: string,
): Promise<readonly ItemData[]> {
  const root = optionalEnv("POE_WATCH_CACHE_DIR");
  const cache =
    root === undefined ? undefined : fileCache<readonly ItemData[]>(root);
  const key = cacheKey(
    "poe-watch",
    league,
    "all",
    String(Math.floor(Date.now() / HOUR_MS)),
  );

  const cached = await cache?.get(key);
  if (cached !== undefined) return cached;

  const url = `${apiUrl()}/compact?league=${encodeURIComponent(league)}&all=true`;

  const response = await fetch(url, {
    headers: {
      "user-agent": requireEnv("POE_USER_AGENT"),
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`poewatch ${response.status} for ${url}`);
  }

  const body = (await response.json()) as CompactResponse;
  await cache?.set(key, body.items);

  return body.items;
}
