import { cacheKey } from "@util/core/cache-key";
import { optionalEnv, requireEnv } from "@util/core/env";
import { fileCache } from "@util/core/file-cache";
import type { ItemCorruptions } from "./types.ts";

const HOUR_MS = 3_600_000;

/** Base of the PoeWatch API. The trailing slash is stripped so joins stay predictable. */
const apiUrl = () => requireEnv("POE_WATCH_BASE_URL").replace(/\/$/, "");

/**
 * Priced corruption outcomes for one league, from `GET /corruptions`.
 *
 * `all=true` is fixed rather than a parameter: the whole point of pulling this is to
 * have every item's outcomes to filter against locally.
 *
 * Cached exactly like `/compact` — hour in the key, `POE_WATCH_CACHE_DIR` naming a
 * folder is the whole switch, unset means every call goes to PoeWatch.
 *
 * Unlike `/compact` this answers with a bare array, no envelope. The body is asserted,
 * not validated: callers that care hand the result to a schema.
 */
export async function getCorruptionData(
  league: string,
): Promise<readonly ItemCorruptions[]> {
  const root = optionalEnv("POE_WATCH_CACHE_DIR");
  const cache =
    root === undefined
      ? undefined
      : fileCache<readonly ItemCorruptions[]>(root);
  const key = cacheKey(
    "poe-watch-corruptions",
    league,
    String(Math.floor(Date.now() / HOUR_MS)),
  );

  const cached = await cache?.get(key);
  if (cached !== undefined) return cached;

  const url = `${apiUrl()}/corruptions?league=${encodeURIComponent(league)}&all=true`;

  const response = await fetch(url, {
    headers: {
      "user-agent": requireEnv("POE_USER_AGENT"),
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`poewatch ${response.status} for ${url}`);
  }

  const body = (await response.json()) as readonly ItemCorruptions[];
  await cache?.set(key, body);

  return body;
}
