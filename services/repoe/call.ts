import { cacheKey } from "@util/cache/cache-key";
import { RepoeHttpError } from "./errors.ts";
import type { RepoeContext } from "./types.ts";

/**
 * One GET against RePoE, answered from the cache where it can be.
 *
 * **No limiter, and nothing here draws on the GGG budget that `@poe/ggg` protects.** These
 * are static JSON files on GitHub Pages. There is nothing to pace and no retry worth
 * making: a file that failed to download is asked for again by whoever wanted it.
 *
 * The cache is what makes that affordable — `base_items.json` is the whole export in one
 * download. The caller passes `salt` and every endpoint passes the hour, so an entry is
 * only ever read back within the hour that wrote it. RePoE only moves when GGG ships a
 * patch, so an hour is already far finer than the data changes; old files are never
 * deleted, they only stop being asked for.
 *
 * The body is asserted, not validated: callers that care hand the result to a schema.
 */
export async function call<T>(
  url: string,
  salt: string,
  { userAgent, cache }: RepoeContext,
): Promise<T> {
  const key = cache && cacheKey("repoe", url, salt);

  if (cache && key) {
    const cached = await cache.get(key);
    if (cached) return cached.body as T;
  }

  const response = await fetch(url, {
    headers: { "user-agent": userAgent, accept: "application/json" },
  });

  if (!response.ok) throw new RepoeHttpError(url, response.status);

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
