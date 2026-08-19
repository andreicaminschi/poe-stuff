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
    String(Math.floor(Date.now() / HOUR_MS)),
  );

  const cached = await cache?.get(key);
  if (cached !== undefined) return cached;

  const url = `${apiUrl()}/compact?league=${encodeURIComponent(league)}`;

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
