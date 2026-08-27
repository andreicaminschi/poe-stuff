import { cacheKey } from "@util/core/cache-key";
import { PoeWatchHttpError } from "./errors.ts";
import type { PoeWatchContext } from "./types.ts";

/**
 * One GET against PoeWatch, answered from the cache where it can be.
 *
 * **No limiter, and nothing here draws on the GGG budget that `@poe/ggg` protects.**
 * PoeWatch publishes no rate limits, and every endpoint in this package is one request for
 * a whole league, so there is nothing to pace and no retry worth making: a league that
 * failed to download is asked for again by whoever wanted it.
 *
 * The cache is what makes that affordable — these answers are tens of megabytes. The
 * caller passes `salt` and every endpoint passes the hour, so an entry is only ever read
 * back within the hour that wrote it. PoeWatch recomputes on the hour, so nothing older is
 * worth keeping, and old files are never deleted, they only stop being asked for.
 *
 * The body is asserted, not validated: callers that care hand the result to a schema.
 */
export async function call<T>(
  url: string,
  salt: string,
  { userAgent, cache }: PoeWatchContext,
): Promise<T> {
  const key = cache && cacheKey("poe-watch", url, salt);

  if (cache && key) {
    const cached = await cache.get(key);
    if (cached) return cached.body as T;
  }

  const response = await fetch(url, {
    headers: { "user-agent": userAgent, accept: "application/json" },
  });

  if (!response.ok) throw new PoeWatchHttpError(url, response.status);

  const body = (await response.json()) as T;

  if (cache && key) {
    await cache.set(key, {
      url,
      status: response.status,
      body,
      storedAt: new Date().toISOString(),
    });
  }

  return body;
}

/** The hour every endpoint salts its cache key with. */
export const currentHour = (): string =>
  String(Math.floor(Date.now() / 3_600_000));
